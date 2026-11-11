package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"finara/server/internal/domain"
)

type transactionRepository struct {
	pool *pgxpool.Pool
}

func NewTransactionRepository(pool *pgxpool.Pool) domain.TransactionRepository {
	return &transactionRepository{
		pool: pool,
	}
}

func (r *transactionRepository) Create(ctx context.Context, tx *domain.Transaction) error {
	var err error
	if tx.ID != "" {
		query := `
			INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, description, transaction_date, transaction_time, client_request_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			tx.ID,
			tx.UserID,
			tx.AccountID,
			tx.CategoryID,
			string(tx.Type),
			tx.Amount,
			tx.Description,
			tx.TransactionDate,
			tx.TransactionTime,
			tx.ClientRequestID,
		).Scan(&tx.CreatedAt, &tx.UpdatedAt)
	} else {
		query := `
			INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, transaction_date, transaction_time, client_request_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			tx.UserID,
			tx.AccountID,
			tx.CategoryID,
			string(tx.Type),
			tx.Amount,
			tx.Description,
			tx.TransactionDate,
			tx.TransactionTime,
			tx.ClientRequestID,
		).Scan(&tx.ID, &tx.CreatedAt, &tx.UpdatedAt)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrDuplicateRequest
		}
		return fmt.Errorf("create transaction: %w", err)
	}

	return nil
}

const selectTransactionFields = `
	t.id, t.user_id, t.account_id, t.category_id, t.type, t.amount,
	t.description, t.transaction_date, t.transaction_time::text, t.client_request_id,
	t.deleted_at, t.created_at, t.updated_at,
	COALESCE(a.name, '') AS account_name,
	COALESCE(c.name, '') AS category_name
`

func (r *transactionRepository) GetByID(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM transactions t
		LEFT JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
		LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
		WHERE t.id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL
	`, selectTransactionFields)

	var tx domain.Transaction
	var txType string
	err := r.pool.QueryRow(ctx, query, txID, userID).Scan(
		&tx.ID,
		&tx.UserID,
		&tx.AccountID,
		&tx.CategoryID,
		&txType,
		&tx.Amount,
		&tx.Description,
		&tx.TransactionDate,
		&tx.TransactionTime,
		&tx.ClientRequestID,
		&tx.DeletedAt,
		&tx.CreatedAt,
		&tx.UpdatedAt,
		&tx.AccountName,
		&tx.CategoryName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get transaction by id: %w", err)
	}
	tx.Type = domain.TransactionType(txType)
	return &tx, nil
}

func (r *transactionRepository) GetByClientRequestID(ctx context.Context, userID, clientRequestID string) (*domain.Transaction, error) {
	query := fmt.Sprintf(`
		SELECT %s
		FROM transactions t
		LEFT JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
		LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
		WHERE t.client_request_id = $1 AND t.user_id = $2 AND t.deleted_at IS NULL
	`, selectTransactionFields)

	var tx domain.Transaction
	var txType string
	err := r.pool.QueryRow(ctx, query, clientRequestID, userID).Scan(
		&tx.ID,
		&tx.UserID,
		&tx.AccountID,
		&tx.CategoryID,
		&txType,
		&tx.Amount,
		&tx.Description,
		&tx.TransactionDate,
		&tx.TransactionTime,
		&tx.ClientRequestID,
		&tx.DeletedAt,
		&tx.CreatedAt,
		&tx.UpdatedAt,
		&tx.AccountName,
		&tx.CategoryName,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get transaction by client request id: %w", err)
	}
	tx.Type = domain.TransactionType(txType)
	return &tx, nil
}

func (r *transactionRepository) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error) {
	if strings.TrimSpace(filter.UserID) == "" {
		return nil, domain.ErrInvalidInput
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`
		SELECT %s
		FROM transactions t
		LEFT JOIN accounts a ON a.id = t.account_id AND a.user_id = t.user_id
		LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
		WHERE t.user_id = $1 AND t.deleted_at IS NULL
	`, selectTransactionFields))

	args := []any{filter.UserID}
	argIdx := 2

	if filter.AccountID != nil && strings.TrimSpace(*filter.AccountID) != "" {
		sb.WriteString(fmt.Sprintf(" AND t.account_id = $%d", argIdx))
		args = append(args, *filter.AccountID)
		argIdx++
	}

	if filter.CategoryID != nil && strings.TrimSpace(*filter.CategoryID) != "" {
		sb.WriteString(fmt.Sprintf(" AND t.category_id = $%d", argIdx))
		args = append(args, *filter.CategoryID)
		argIdx++
	}

	if filter.Type != nil && strings.TrimSpace(string(*filter.Type)) != "" {
		sb.WriteString(fmt.Sprintf(" AND t.type = $%d", argIdx))
		args = append(args, string(*filter.Type))
		argIdx++
	}

	if filter.StartDate != nil && !filter.StartDate.IsZero() {
		sb.WriteString(fmt.Sprintf(" AND t.transaction_date >= $%d", argIdx))
		args = append(args, *filter.StartDate)
		argIdx++
	}

	if filter.EndDate != nil && !filter.EndDate.IsZero() {
		sb.WriteString(fmt.Sprintf(" AND t.transaction_date <= $%d", argIdx))
		args = append(args, *filter.EndDate)
		argIdx++
	}

	if strings.TrimSpace(filter.Search) != "" {
		sb.WriteString(fmt.Sprintf(" AND t.description ILIKE $%d", argIdx))
		args = append(args, "%"+strings.TrimSpace(filter.Search)+"%")
		argIdx++
	}

	sb.WriteString(" ORDER BY t.transaction_date DESC, t.created_at DESC")

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	sb.WriteString(fmt.Sprintf(" LIMIT $%d", argIdx))
	args = append(args, limit)
	argIdx++

	if filter.Offset > 0 {
		sb.WriteString(fmt.Sprintf(" OFFSET $%d", argIdx))
		args = append(args, filter.Offset)
		argIdx++
	}

	rows, err := r.pool.Query(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("list transactions: %w", err)
	}
	defer rows.Close()

	var transactions []domain.Transaction
	for rows.Next() {
		var tx domain.Transaction
		var txType string
		if err := rows.Scan(
			&tx.ID,
			&tx.UserID,
			&tx.AccountID,
			&tx.CategoryID,
			&txType,
			&tx.Amount,
			&tx.Description,
			&tx.TransactionDate,
			&tx.TransactionTime,
			&tx.ClientRequestID,
			&tx.DeletedAt,
			&tx.CreatedAt,
			&tx.UpdatedAt,
			&tx.AccountName,
			&tx.CategoryName,
		); err != nil {
			return nil, fmt.Errorf("scan transaction row: %w", err)
		}
		tx.Type = domain.TransactionType(txType)
		transactions = append(transactions, tx)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate transaction rows: %w", err)
	}

	if transactions == nil {
		transactions = []domain.Transaction{}
	}

	return transactions, nil
}

func (r *transactionRepository) Update(ctx context.Context, tx *domain.Transaction) error {
	query := `
		UPDATE transactions
		SET account_id = $1, category_id = $2, type = $3, amount = $4,
		    description = $5, transaction_date = $6, transaction_time = $7, updated_at = NOW()
		WHERE id = $8 AND user_id = $9 AND deleted_at IS NULL
		RETURNING updated_at
	`
	err := r.pool.QueryRow(ctx, query,
		tx.AccountID,
		tx.CategoryID,
		string(tx.Type),
		tx.Amount,
		tx.Description,
		tx.TransactionDate,
		tx.TransactionTime,
		tx.ID,
		tx.UserID,
	).Scan(&tx.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return fmt.Errorf("update transaction: %w", err)
	}

	return nil
}

func (r *transactionRepository) SoftDelete(ctx context.Context, userID, txID string) error {
	query := `
		UPDATE transactions
		SET deleted_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`
	cmdTag, err := r.pool.Exec(ctx, query, txID, userID)
	if err != nil {
		return fmt.Errorf("soft delete transaction: %w", err)
	}
	if cmdTag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *transactionRepository) GetMonthlySnapshot(ctx context.Context, userID string, start, end time.Time) (*domain.FinancialSnapshot, error) {
	query := `
		SELECT
			COALESCE((SELECT SUM(opening_balance) FROM accounts WHERE user_id = $1), 0)
			+ COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = 'INCOME' AND deleted_at IS NULL), 0)
			- COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = 'EXPENSE' AND deleted_at IS NULL), 0) AS total_balance,
			COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = 'INCOME' AND deleted_at IS NULL AND transaction_date >= $2 AND transaction_date < $3), 0) AS monthly_income,
			COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = $1 AND type = 'EXPENSE' AND deleted_at IS NULL AND transaction_date >= $2 AND transaction_date < $3), 0) AS monthly_expense
	`
	var snapshot domain.FinancialSnapshot
	err := r.pool.QueryRow(ctx, query, userID, start, end).Scan(
		&snapshot.TotalBalance,
		&snapshot.MonthlyIncome,
		&snapshot.MonthlyExpense,
	)
	if err != nil {
		return nil, fmt.Errorf("get monthly snapshot: %w", err)
	}

	return &snapshot, nil
}

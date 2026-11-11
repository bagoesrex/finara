package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"finara/server/internal/domain"
)

type accountRepository struct {
	pool *pgxpool.Pool
}

func NewAccountRepository(pool *pgxpool.Pool) domain.AccountRepository {
	return &accountRepository{
		pool: pool,
	}
}

func (r *accountRepository) Create(ctx context.Context, account *domain.Account) error {
	var err error
	if account.ID != "" {
		query := `
			INSERT INTO accounts (id, user_id, name, type, opening_balance, opening_balance_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			account.ID,
			account.UserID,
			account.Name,
			string(account.Type),
			account.OpeningBalance,
			account.OpeningBalanceAt,
		).Scan(&account.CreatedAt, &account.UpdatedAt)
	} else {
		query := `
			INSERT INTO accounts (user_id, name, type, opening_balance, opening_balance_at)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			account.UserID,
			account.Name,
			string(account.Type),
			account.OpeningBalance,
			account.OpeningBalanceAt,
		).Scan(&account.ID, &account.CreatedAt, &account.UpdatedAt)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("create account: %w", err)
	}

	return nil
}

func (r *accountRepository) GetByID(ctx context.Context, userID, accountID string) (*domain.Account, error) {
	query := `
		SELECT id, user_id, name, type, opening_balance, opening_balance_at, created_at, updated_at
		FROM accounts
		WHERE id = $1 AND user_id = $2
	`
	var acc domain.Account
	var accType string
	err := r.pool.QueryRow(ctx, query, accountID, userID).Scan(
		&acc.ID,
		&acc.UserID,
		&acc.Name,
		&accType,
		&acc.OpeningBalance,
		&acc.OpeningBalanceAt,
		&acc.CreatedAt,
		&acc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, fmt.Errorf("get account by id: %w", err)
	}
	acc.Type = domain.AccountType(accType)
	return &acc, nil
}

func (r *accountRepository) ListByUserID(ctx context.Context, userID string) ([]domain.Account, error) {
	query := `
		SELECT id, user_id, name, type, opening_balance, opening_balance_at, created_at, updated_at
		FROM accounts
		WHERE user_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list accounts by user id: %w", err)
	}
	defer rows.Close()

	var accounts []domain.Account
	for rows.Next() {
		var acc domain.Account
		var accType string
		if err := rows.Scan(
			&acc.ID,
			&acc.UserID,
			&acc.Name,
			&accType,
			&acc.OpeningBalance,
			&acc.OpeningBalanceAt,
			&acc.CreatedAt,
			&acc.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan account row: %w", err)
		}
		acc.Type = domain.AccountType(accType)
		accounts = append(accounts, acc)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accounts rows: %w", err)
	}

	if accounts == nil {
		accounts = []domain.Account{}
	}

	return accounts, nil
}

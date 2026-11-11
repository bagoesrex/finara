package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"finara/server/internal/domain"
)

type budgetRepository struct {
	pool *pgxpool.Pool
}

func NewBudgetRepository(pool *pgxpool.Pool) domain.BudgetRepository {
	return &budgetRepository{
		pool: pool,
	}
}

func (r *budgetRepository) Upsert(ctx context.Context, budget *domain.Budget) error {
	var err error
	if budget.CategoryType == "" {
		budget.CategoryType = domain.TransactionTypeExpense
	}

	if budget.ID != "" {
		query := `
			INSERT INTO budgets (id, user_id, category_id, category_type, period_start, amount)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (user_id, category_id, period_start)
			DO UPDATE SET
				amount = EXCLUDED.amount,
				updated_at = NOW()
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			budget.ID,
			budget.UserID,
			budget.CategoryID,
			string(budget.CategoryType),
			budget.PeriodStart,
			budget.Amount,
		).Scan(&budget.ID, &budget.CreatedAt, &budget.UpdatedAt)
	} else {
		query := `
			INSERT INTO budgets (user_id, category_id, category_type, period_start, amount)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (user_id, category_id, period_start)
			DO UPDATE SET
				amount = EXCLUDED.amount,
				updated_at = NOW()
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			budget.UserID,
			budget.CategoryID,
			string(budget.CategoryType),
			budget.PeriodStart,
			budget.Amount,
		).Scan(&budget.ID, &budget.CreatedAt, &budget.UpdatedAt)
	}

	if err != nil {
		return fmt.Errorf("upsert budget: %w", err)
	}

	return nil
}

func (r *budgetRepository) ListByMonth(ctx context.Context, userID string, periodStart time.Time) ([]domain.BudgetWithProgress, error) {
	// Normalize to start of month
	start := time.Date(periodStart.Year(), periodStart.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	query := `
		SELECT
			b.id,
			b.user_id,
			b.category_id,
			b.category_type,
			b.period_start,
			b.amount,
			b.created_at,
			b.updated_at,
			c.name AS category_name,
			COALESCE(SUM(t.amount), 0) AS spent
		FROM budgets b
		JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
		LEFT JOIN transactions t ON t.user_id = b.user_id
			AND t.category_id = b.category_id
			AND t.type = 'EXPENSE'
			AND t.deleted_at IS NULL
			AND t.transaction_date >= $2
			AND t.transaction_date < $3
		WHERE b.user_id = $1 AND b.period_start = $2
		GROUP BY b.id, b.user_id, b.category_id, b.category_type, b.period_start, b.amount, b.created_at, b.updated_at, c.name
		ORDER BY c.name ASC
	`
	rows, err := r.pool.Query(ctx, query, userID, start, end)
	if err != nil {
		return nil, fmt.Errorf("list budgets by month: %w", err)
	}
	defer rows.Close()

	var results []domain.BudgetWithProgress
	for rows.Next() {
		var b domain.BudgetWithProgress
		var catType string
		if err := rows.Scan(
			&b.ID,
			&b.UserID,
			&b.CategoryID,
			&catType,
			&b.PeriodStart,
			&b.Amount,
			&b.CreatedAt,
			&b.UpdatedAt,
			&b.CategoryName,
			&b.Spent,
		); err != nil {
			return nil, fmt.Errorf("scan budget row: %w", err)
		}
		b.CategoryType = domain.TransactionType(catType)
		b.Remaining = b.Amount - b.Spent
		results = append(results, b)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate budget rows: %w", err)
	}

	if results == nil {
		results = []domain.BudgetWithProgress{}
	}

	return results, nil
}

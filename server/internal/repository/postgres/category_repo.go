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

type categoryRepository struct {
	pool *pgxpool.Pool
}

func NewCategoryRepository(pool *pgxpool.Pool) domain.CategoryRepository {
	return &categoryRepository{
		pool: pool,
	}
}

func (r *categoryRepository) Create(ctx context.Context, category *domain.Category) error {
	var err error
	if category.ID != "" {
		query := `
			INSERT INTO categories (id, user_id, name, type)
			VALUES ($1, $2, $3, $4)
			RETURNING created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			category.ID,
			category.UserID,
			category.Name,
			string(category.Type),
		).Scan(&category.CreatedAt, &category.UpdatedAt)
	} else {
		query := `
			INSERT INTO categories (user_id, name, type)
			VALUES ($1, $2, $3)
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query,
			category.UserID,
			category.Name,
			string(category.Type),
		).Scan(&category.ID, &category.CreatedAt, &category.UpdatedAt)
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("create category: %w", err)
	}

	return nil
}

func (r *categoryRepository) GetByID(ctx context.Context, userID, categoryID string) (*domain.Category, error) {
	query := `
		SELECT id, user_id, name, type, created_at, updated_at
		FROM categories
		WHERE id = $1 AND user_id = $2
	`
	var cat domain.Category
	var catType string
	err := r.pool.QueryRow(ctx, query, categoryID, userID).Scan(
		&cat.ID,
		&cat.UserID,
		&cat.Name,
		&catType,
		&cat.CreatedAt,
		&cat.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrCategoryNotFound
		}
		return nil, fmt.Errorf("get category by id: %w", err)
	}
	cat.Type = domain.TransactionType(catType)
	return &cat, nil
}

func (r *categoryRepository) ListByUserID(ctx context.Context, userID string) ([]domain.Category, error) {
	query := `
		SELECT id, user_id, name, type, created_at, updated_at
		FROM categories
		WHERE user_id = $1
		ORDER BY type ASC, name ASC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list categories by user id: %w", err)
	}
	defer rows.Close()

	var categories []domain.Category
	for rows.Next() {
		var cat domain.Category
		var catType string
		if err := rows.Scan(
			&cat.ID,
			&cat.UserID,
			&cat.Name,
			&catType,
			&cat.CreatedAt,
			&cat.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan category row: %w", err)
		}
		cat.Type = domain.TransactionType(catType)
		categories = append(categories, cat)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories rows: %w", err)
	}

	if categories == nil {
		categories = []domain.Category{}
	}

	return categories, nil
}

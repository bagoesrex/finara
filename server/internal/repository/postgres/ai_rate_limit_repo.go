package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"finara/server/internal/domain"
)

type aiRateLimitRepository struct {
	pool *pgxpool.Pool
}

func NewAIRateLimitRepository(pool *pgxpool.Pool) domain.AIRateLimitRepository {
	return &aiRateLimitRepository{pool: pool}
}

func (r *aiRateLimitRepository) Allow(ctx context.Context, userID string, maxRequests int, window time.Duration) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var windowStartedAt time.Time
	var requestCount int

	query := `
		SELECT window_started_at, request_count
		FROM ai_rate_limits
		WHERE user_id = $1
		FOR UPDATE
	`
	now := time.Now()
	err = tx.QueryRow(ctx, query, userID).Scan(&windowStartedAt, &requestCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			insertQuery := `
				INSERT INTO ai_rate_limits (user_id, window_started_at, request_count, updated_at)
				VALUES ($1, $2, 1, $2)
			`
			if _, insErr := tx.Exec(ctx, insertQuery, userID, now); insErr != nil {
				return false, fmt.Errorf("insert rate limit: %w", insErr)
			}
			if err := tx.Commit(ctx); err != nil {
				return false, fmt.Errorf("commit tx: %w", err)
			}
			return true, nil
		}
		return false, fmt.Errorf("select rate limit: %w", err)
	}

	if now.Sub(windowStartedAt) >= window {
		updateQuery := `
			UPDATE ai_rate_limits
			SET window_started_at = $2, request_count = 1, updated_at = $2
			WHERE user_id = $1
		`
		if _, updErr := tx.Exec(ctx, updateQuery, userID, now); updErr != nil {
			return false, fmt.Errorf("reset rate limit window: %w", updErr)
		}
		if err := tx.Commit(ctx); err != nil {
			return false, fmt.Errorf("commit tx: %w", err)
		}
		return true, nil
	}

	if requestCount >= maxRequests {
		_ = tx.Commit(ctx)
		return false, nil
	}

	incQuery := `
		UPDATE ai_rate_limits
		SET request_count = request_count + 1, updated_at = $2
		WHERE user_id = $1
	`
	if _, updErr := tx.Exec(ctx, incQuery, userID, now); updErr != nil {
		return false, fmt.Errorf("increment rate limit: %w", updErr)
	}
	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit tx: %w", err)
	}
	return true, nil
}

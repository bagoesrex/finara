package domain

import (
	"context"
	"strings"
	"time"
)

type Budget struct {
	ID           string          `json:"id"`
	UserID       string          `json:"user_id"`
	CategoryID   string          `json:"category_id"`
	CategoryType TransactionType `json:"category_type"`
	PeriodStart  time.Time       `json:"period_start"`
	Amount       int64           `json:"amount"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

func (b *Budget) Validate() error {
	if strings.TrimSpace(b.UserID) == "" {
		return ErrInvalidInput
	}
	if strings.TrimSpace(b.CategoryID) == "" {
		return ErrCategoryNotFound
	}
	if b.Amount <= 0 {
		return ErrInvalidAmount
	}
	if b.PeriodStart.IsZero() {
		return ErrInvalidInput
	}
	return nil
}

type BudgetWithProgress struct {
	Budget
	CategoryName string `json:"category_name"`
	Spent        int64  `json:"spent"`
	Remaining    int64  `json:"remaining"`
}

type BudgetRepository interface {
	Upsert(ctx context.Context, budget *Budget) error
	ListByMonth(ctx context.Context, userID string, periodStart time.Time) ([]BudgetWithProgress, error)
}

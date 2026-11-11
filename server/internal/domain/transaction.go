package domain

import (
	"context"
	"strings"
	"time"
)

type Transaction struct {
	ID              string          `json:"id"`
	UserID          string          `json:"user_id"`
	AccountID       string          `json:"account_id"`
	CategoryID      string          `json:"category_id"`
	Type            TransactionType `json:"type"`
	Amount          int64           `json:"amount"`
	Description     string          `json:"description"`
	TransactionDate time.Time       `json:"transaction_date"`
	TransactionTime *string         `json:"transaction_time,omitempty"`
	ClientRequestID string          `json:"client_request_id"`
	DeletedAt       *time.Time      `json:"deleted_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`

	AccountName  string `json:"account_name,omitempty"`
	CategoryName string `json:"category_name,omitempty"`
}

func (t *Transaction) Validate() error {
	if strings.TrimSpace(t.UserID) == "" {
		return ErrInvalidInput
	}
	if strings.TrimSpace(t.AccountID) == "" {
		return ErrAccountNotFound
	}
	if strings.TrimSpace(t.CategoryID) == "" {
		return ErrCategoryNotFound
	}
	if t.Type != TransactionTypeIncome && t.Type != TransactionTypeExpense {
		return ErrInvalidInput
	}
	if t.Amount <= 0 {
		return ErrInvalidAmount
	}
	if strings.TrimSpace(t.Description) == "" {
		return ErrInvalidInput
	}
	if t.TransactionDate.IsZero() {
		return ErrInvalidInput
	}
	if strings.TrimSpace(t.ClientRequestID) == "" {
		return ErrInvalidInput
	}
	return nil
}

type TransactionFilter struct {
	UserID     string           `json:"user_id"`
	AccountID  *string          `json:"account_id,omitempty"`
	CategoryID *string          `json:"category_id,omitempty"`
	Type       *TransactionType `json:"type,omitempty"`
	StartDate  *time.Time       `json:"start_date,omitempty"`
	EndDate    *time.Time       `json:"end_date,omitempty"`
	Search     string           `json:"search,omitempty"`
	Cursor     string           `json:"cursor,omitempty"`
	Limit      int              `json:"limit,omitempty"`
}

type FinancialSnapshot struct {
	TotalBalance   int64 `json:"total_balance"`
	MonthlyIncome  int64 `json:"monthly_income"`
	MonthlyExpense int64 `json:"monthly_expense"`
}

type TransactionRepository interface {
	Create(ctx context.Context, tx *Transaction) error
	GetByID(ctx context.Context, userID, txID string) (*Transaction, error)
	List(ctx context.Context, filter TransactionFilter) ([]Transaction, error)
	Update(ctx context.Context, tx *Transaction) error
	SoftDelete(ctx context.Context, userID, txID string) error
	GetMonthlySnapshot(ctx context.Context, userID string, start, end time.Time) (*FinancialSnapshot, error)
}

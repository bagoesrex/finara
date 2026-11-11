package domain

import (
	"context"
	"time"
)

type ParsedTransactionDraft struct {
	Amount          int64           `json:"amount"`
	Type            TransactionType `json:"type"`
	CategoryID      string          `json:"category_id"`
	AccountID       string          `json:"account_id"`
	Description     string          `json:"description"`
	TransactionDate string          `json:"transaction_date"` // YYYY-MM-DD
}

type AIRateLimitRepository interface {
	Allow(ctx context.Context, userID string, maxRequests int, window time.Duration) (bool, error)
}

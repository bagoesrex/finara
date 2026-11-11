package domain

import (
	"context"
	"time"
)

type AccountType string

const (
	AccountTypeCash    AccountType = "CASH"
	AccountTypeBank    AccountType = "BANK"
	AccountTypeEWallet AccountType = "E_WALLET"
)

type Account struct {
	ID               string      `json:"id"`
	UserID           string      `json:"user_id"`
	Name             string      `json:"name"`
	Type             AccountType `json:"type"`
	OpeningBalance   int64       `json:"opening_balance"`
	OpeningBalanceAt time.Time   `json:"opening_balance_at"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

type AccountRepository interface {
	Create(ctx context.Context, account *Account) error
	GetByID(ctx context.Context, userID, accountID string) (*Account, error)
	ListByUserID(ctx context.Context, userID string) ([]Account, error)
}

package domain_test

import (
	"errors"
	"testing"
	"time"

	"finara/server/internal/domain"
)

func validTransaction() domain.Transaction {
	return domain.Transaction{
		ID:              "tx-1",
		UserID:          "user-1",
		AccountID:       "acc-1",
		CategoryID:      "cat-1",
		Type:            domain.TransactionTypeExpense,
		Amount:          50000,
		Description:     "Makan Siang",
		TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
		ClientRequestID: "req-123",
	}
}

func TestTransaction_Validate(t *testing.T) {
	tests := []struct {
		name        string
		modify      func(tx *domain.Transaction)
		expectedErr error
	}{
		{
			name:        "valid transaction succeeds",
			modify:      func(tx *domain.Transaction) {},
			expectedErr: nil,
		},
		{
			name: "zero amount fails with ErrInvalidAmount",
			modify: func(tx *domain.Transaction) {
				tx.Amount = 0
			},
			expectedErr: domain.ErrInvalidAmount,
		},
		{
			name: "negative amount fails with ErrInvalidAmount",
			modify: func(tx *domain.Transaction) {
				tx.Amount = -10000
			},
			expectedErr: domain.ErrInvalidAmount,
		},
		{
			name: "missing user ID fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.UserID = ""
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "whitespace user ID fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.UserID = "   "
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "missing account ID fails with ErrAccountNotFound",
			modify: func(tx *domain.Transaction) {
				tx.AccountID = ""
			},
			expectedErr: domain.ErrAccountNotFound,
		},
		{
			name: "missing category ID fails with ErrCategoryNotFound",
			modify: func(tx *domain.Transaction) {
				tx.CategoryID = ""
			},
			expectedErr: domain.ErrCategoryNotFound,
		},
		{
			name: "invalid transaction type fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.Type = "INVALID"
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "empty description fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.Description = ""
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "whitespace description fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.Description = "   \t\n "
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "zero transaction date fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.TransactionDate = time.Time{}
			},
			expectedErr: domain.ErrInvalidInput,
		},
		{
			name: "missing client request id fails with ErrInvalidInput",
			modify: func(tx *domain.Transaction) {
				tx.ClientRequestID = ""
			},
			expectedErr: domain.ErrInvalidInput,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tx := validTransaction()
			tc.modify(&tx)

			err := tx.Validate()
			if tc.expectedErr == nil {
				if err != nil {
					t.Fatalf("expected nil error, got: %v", err)
				}
			} else {
				if !errors.Is(err, tc.expectedErr) {
					t.Fatalf("expected error %v, got: %v", tc.expectedErr, err)
				}
			}
		})
	}
}

func TestBudget_Validate(t *testing.T) {
	validBudget := domain.Budget{
		ID:           "b-1",
		UserID:       "user-1",
		CategoryID:   "cat-1",
		CategoryType: domain.TransactionTypeExpense,
		PeriodStart:  time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
		Amount:       1000000,
	}

	t.Run("valid budget succeeds", func(t *testing.T) {
		b := validBudget
		if err := b.Validate(); err != nil {
			t.Fatalf("expected nil error, got: %v", err)
		}
	})

	t.Run("zero or negative amount fails with ErrInvalidAmount", func(t *testing.T) {
		b := validBudget
		b.Amount = 0
		if !errors.Is(b.Validate(), domain.ErrInvalidAmount) {
			t.Fatalf("expected ErrInvalidAmount, got: %v", b.Validate())
		}
		b.Amount = -500
		if !errors.Is(b.Validate(), domain.ErrInvalidAmount) {
			t.Fatalf("expected ErrInvalidAmount, got: %v", b.Validate())
		}
	})

	t.Run("missing user ID fails", func(t *testing.T) {
		b := validBudget
		b.UserID = ""
		if !errors.Is(b.Validate(), domain.ErrInvalidInput) {
			t.Fatalf("expected ErrInvalidInput, got: %v", b.Validate())
		}
	})

	t.Run("missing category ID fails with ErrCategoryNotFound", func(t *testing.T) {
		b := validBudget
		b.CategoryID = ""
		if !errors.Is(b.Validate(), domain.ErrCategoryNotFound) {
			t.Fatalf("expected ErrCategoryNotFound, got: %v", b.Validate())
		}
	})

	t.Run("zero period start fails", func(t *testing.T) {
		b := validBudget
		b.PeriodStart = time.Time{}
		if !errors.Is(b.Validate(), domain.ErrInvalidInput) {
			t.Fatalf("expected ErrInvalidInput, got: %v", b.Validate())
		}
	})
}

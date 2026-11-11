package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"finara/server/internal/domain"
)

type UpdateTransactionInput struct {
	AccountID       *string                 `json:"account_id"`
	CategoryID      *string                 `json:"category_id"`
	Type            *domain.TransactionType `json:"type"`
	Amount          *int64                  `json:"amount"`
	Description     *string                 `json:"description"`
	TransactionDate *time.Time              `json:"transaction_date"`
	TransactionTime *string                 `json:"transaction_time"`
}

type TransactionUsecase interface {
	Create(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error)
	GetByID(ctx context.Context, userID, txID string) (*domain.Transaction, error)
	List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error)
	Update(ctx context.Context, userID, txID string, input UpdateTransactionInput) (*domain.Transaction, error)
	Delete(ctx context.Context, userID, txID string) error
}

type transactionUsecase struct {
	txRepo       domain.TransactionRepository
	accountRepo  domain.AccountRepository
	categoryRepo domain.CategoryRepository
}

func NewTransactionUsecase(
	txRepo domain.TransactionRepository,
	accountRepo domain.AccountRepository,
	categoryRepo domain.CategoryRepository,
) TransactionUsecase {
	return &transactionUsecase{
		txRepo:       txRepo,
		accountRepo:  accountRepo,
		categoryRepo: categoryRepo,
	}
}

func (u *transactionUsecase) Create(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error) {
	if err := tx.Validate(); err != nil {
		return nil, err
	}

	acc, err := u.accountRepo.GetByID(ctx, tx.UserID, tx.AccountID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) || errors.Is(err, domain.ErrAccountNotFound) {
			return nil, domain.ErrAccountNotFound
		}
		return nil, err
	}

	cat, err := u.categoryRepo.GetByID(ctx, tx.UserID, tx.CategoryID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) || errors.Is(err, domain.ErrCategoryNotFound) {
			return nil, domain.ErrCategoryNotFound
		}
		return nil, err
	}

	if cat.Type != tx.Type {
		return nil, domain.ErrInvalidInput
	}

	err = u.txRepo.Create(ctx, tx)
	if err != nil {
		if errors.Is(err, domain.ErrDuplicateRequest) || errors.Is(err, domain.ErrConflict) {
			existing, getErr := u.txRepo.GetByClientRequestID(ctx, tx.UserID, tx.ClientRequestID)
			if getErr == nil && existing != nil {
				return existing, nil
			}
			return nil, domain.ErrDuplicateRequest
		}
		return nil, err
	}

	tx.AccountName = acc.Name
	tx.CategoryName = cat.Name

	return tx, nil
}

func (u *transactionUsecase) GetByID(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(txID) == "" {
		return nil, domain.ErrInvalidInput
	}
	return u.txRepo.GetByID(ctx, userID, txID)
}

func (u *transactionUsecase) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error) {
	if strings.TrimSpace(filter.UserID) == "" {
		return nil, domain.ErrInvalidInput
	}
	return u.txRepo.List(ctx, filter)
}

func (u *transactionUsecase) Update(ctx context.Context, userID, txID string, input UpdateTransactionInput) (*domain.Transaction, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(txID) == "" {
		return nil, domain.ErrInvalidInput
	}

	tx, err := u.txRepo.GetByID(ctx, userID, txID)
	if err != nil {
		return nil, err
	}

	if input.Amount != nil {
		if *input.Amount <= 0 {
			return nil, domain.ErrInvalidAmount
		}
		tx.Amount = *input.Amount
	}

	if input.Description != nil {
		desc := strings.TrimSpace(*input.Description)
		if desc == "" {
			return nil, domain.ErrInvalidInput
		}
		tx.Description = desc
	}

	if input.TransactionDate != nil {
		if input.TransactionDate.IsZero() {
			return nil, domain.ErrInvalidInput
		}
		tx.TransactionDate = *input.TransactionDate
	}

	if input.TransactionTime != nil {
		tx.TransactionTime = input.TransactionTime
	}

	if input.AccountID != nil && strings.TrimSpace(*input.AccountID) != "" {
		acc, err := u.accountRepo.GetByID(ctx, userID, *input.AccountID)
		if err != nil {
			return nil, domain.ErrAccountNotFound
		}
		tx.AccountID = acc.ID
		tx.AccountName = acc.Name
	}

	targetType := tx.Type
	if input.Type != nil {
		if *input.Type != domain.TransactionTypeIncome && *input.Type != domain.TransactionTypeExpense {
			return nil, domain.ErrInvalidInput
		}
		targetType = *input.Type
	}

	if input.CategoryID != nil && strings.TrimSpace(*input.CategoryID) != "" {
		cat, err := u.categoryRepo.GetByID(ctx, userID, *input.CategoryID)
		if err != nil {
			return nil, domain.ErrCategoryNotFound
		}
		if cat.Type != targetType {
			return nil, domain.ErrInvalidInput
		}
		tx.CategoryID = cat.ID
		tx.CategoryName = cat.Name
	} else if input.Type != nil && *input.Type != tx.Type {
		// Category wasn't updated, but type changed: verify existing category matches new type
		cat, err := u.categoryRepo.GetByID(ctx, userID, tx.CategoryID)
		if err != nil {
			return nil, domain.ErrCategoryNotFound
		}
		if cat.Type != targetType {
			return nil, domain.ErrInvalidInput
		}
	}
	tx.Type = targetType

	if err := u.txRepo.Update(ctx, tx); err != nil {
		return nil, err
	}

	return tx, nil
}

func (u *transactionUsecase) Delete(ctx context.Context, userID, txID string) error {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(txID) == "" {
		return domain.ErrInvalidInput
	}
	return u.txRepo.SoftDelete(ctx, userID, txID)
}

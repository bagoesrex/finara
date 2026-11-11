package usecase

import (
	"context"
	"strings"
	"time"

	"finara/server/internal/domain"
)

type FinanceUsecase interface {
	ListAccounts(ctx context.Context, userID string) ([]domain.Account, error)
	ListCategories(ctx context.Context, userID string) ([]domain.Category, error)
	GetSnapshot(ctx context.Context, userID string) (*domain.FinancialSnapshot, error)
}

type financeUsecase struct {
	accountRepo  domain.AccountRepository
	categoryRepo domain.CategoryRepository
	txRepo       domain.TransactionRepository
}

func NewFinanceUsecase(
	accountRepo domain.AccountRepository,
	categoryRepo domain.CategoryRepository,
	txRepo domain.TransactionRepository,
) FinanceUsecase {
	return &financeUsecase{
		accountRepo:  accountRepo,
		categoryRepo: categoryRepo,
		txRepo:       txRepo,
	}
}

func (u *financeUsecase) ListAccounts(ctx context.Context, userID string) ([]domain.Account, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, domain.ErrInvalidInput
	}
	return u.accountRepo.ListByUserID(ctx, userID)
}

func (u *financeUsecase) ListCategories(ctx context.Context, userID string) ([]domain.Category, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, domain.ErrInvalidInput
	}
	return u.categoryRepo.ListByUserID(ctx, userID)
}

func (u *financeUsecase) GetSnapshot(ctx context.Context, userID string) (*domain.FinancialSnapshot, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, domain.ErrInvalidInput
	}
	now := time.Now().UTC()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	return u.txRepo.GetMonthlySnapshot(ctx, userID, start, end)
}

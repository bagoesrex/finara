package usecase

import (
	"context"
	"strings"
	"time"

	"finara/server/internal/domain"
)

type BudgetUsecase interface {
	Upsert(ctx context.Context, budget *domain.Budget) (*domain.Budget, error)
	ListByMonth(ctx context.Context, userID string, month time.Time) ([]domain.BudgetWithProgress, error)
}

type budgetUsecase struct {
	budgetRepo   domain.BudgetRepository
	categoryRepo domain.CategoryRepository
}

func NewBudgetUsecase(
	budgetRepo domain.BudgetRepository,
	categoryRepo domain.CategoryRepository,
) BudgetUsecase {
	return &budgetUsecase{
		budgetRepo:   budgetRepo,
		categoryRepo: categoryRepo,
	}
}

func (u *budgetUsecase) Upsert(ctx context.Context, budget *domain.Budget) (*domain.Budget, error) {
	if err := budget.Validate(); err != nil {
		return nil, err
	}

	cat, err := u.categoryRepo.GetByID(ctx, budget.UserID, budget.CategoryID)
	if err != nil {
		return nil, domain.ErrCategoryNotFound
	}

	if cat.Type != domain.TransactionTypeExpense {
		return nil, domain.ErrInvalidInput
	}

	budget.CategoryType = domain.TransactionTypeExpense
	budget.PeriodStart = time.Date(budget.PeriodStart.Year(), budget.PeriodStart.Month(), 1, 0, 0, 0, 0, time.UTC)

	if err := u.budgetRepo.Upsert(ctx, budget); err != nil {
		return nil, err
	}

	return budget, nil
}

func (u *budgetUsecase) ListByMonth(ctx context.Context, userID string, month time.Time) ([]domain.BudgetWithProgress, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, domain.ErrInvalidInput
	}

	if month.IsZero() {
		month = time.Now().UTC()
	}

	periodStart := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	return u.budgetRepo.ListByMonth(ctx, userID, periodStart)
}

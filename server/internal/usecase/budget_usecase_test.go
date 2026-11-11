package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockBudgetRepo struct {
	budgets map[string]*domain.Budget
	spent   map[string]int64
}

func newMockBudgetRepo() *mockBudgetRepo {
	return &mockBudgetRepo{
		budgets: make(map[string]*domain.Budget),
		spent:   make(map[string]int64),
	}
}

func (m *mockBudgetRepo) Upsert(ctx context.Context, budget *domain.Budget) error {
	key := budget.UserID + ":" + budget.CategoryID + ":" + budget.PeriodStart.Format("2006-01-02")
	if budget.ID == "" {
		budget.ID = "b-" + key
	}
	budget.CreatedAt = time.Now()
	budget.UpdatedAt = time.Now()
	m.budgets[key] = budget
	return nil
}

func (m *mockBudgetRepo) ListByMonth(ctx context.Context, userID string, periodStart time.Time) ([]domain.BudgetWithProgress, error) {
	normStart := time.Date(periodStart.Year(), periodStart.Month(), 1, 0, 0, 0, 0, time.UTC)
	var list []domain.BudgetWithProgress
	for _, b := range m.budgets {
		if b.UserID == userID && b.PeriodStart.Equal(normStart) {
			spent := m.spent[b.CategoryID]
			list = append(list, domain.BudgetWithProgress{
				Budget:       *b,
				CategoryName: "Category-" + b.CategoryID,
				Spent:        spent,
				Remaining:    b.Amount - spent,
			})
		}
	}
	return list, nil
}

func TestBudgetUsecase_Upsert(t *testing.T) {
	userID := "user-123"
	catExpenseID := "cat-expense"
	catIncomeID := "cat-income"

	catRepo := &mockCategoryRepo{
		categories: map[string]*domain.Category{
			catExpenseID: {ID: catExpenseID, UserID: userID, Name: "Belanja", Type: domain.TransactionTypeExpense},
			catIncomeID:  {ID: catIncomeID, UserID: userID, Name: "Bonus", Type: domain.TransactionTypeIncome},
		},
	}
	budgetRepo := newMockBudgetRepo()
	uc := usecase.NewBudgetUsecase(budgetRepo, catRepo)
	ctx := context.Background()

	t.Run("success upserting expense budget", func(t *testing.T) {
		b := &domain.Budget{
			UserID:      userID,
			CategoryID:  catExpenseID,
			PeriodStart: time.Date(2026, 11, 15, 10, 0, 0, 0, time.UTC), // mid-month date
			Amount:      1500000,
		}

		res, err := uc.Upsert(ctx, b)
		if err != nil {
			t.Fatalf("expected no error, got: %v", err)
		}
		if res.ID == "" {
			t.Errorf("expected budget ID to be assigned")
		}
		// Must be normalized to 1st of month
		expectedStart := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
		if !res.PeriodStart.Equal(expectedStart) {
			t.Errorf("expected periodStart %v, got %v", expectedStart, res.PeriodStart)
		}
		if res.CategoryType != domain.TransactionTypeExpense {
			t.Errorf("expected category type EXPENSE, got %v", res.CategoryType)
		}
	})

	t.Run("fails when category not found", func(t *testing.T) {
		b := &domain.Budget{
			UserID:      userID,
			CategoryID:  "cat-none",
			PeriodStart: time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
			Amount:      500000,
		}
		_, err := uc.Upsert(ctx, b)
		if !errors.Is(err, domain.ErrCategoryNotFound) {
			t.Errorf("expected ErrCategoryNotFound, got: %v", err)
		}
	})

	t.Run("fails when category is income instead of expense", func(t *testing.T) {
		b := &domain.Budget{
			UserID:      userID,
			CategoryID:  catIncomeID,
			PeriodStart: time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
			Amount:      500000,
		}
		_, err := uc.Upsert(ctx, b)
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput for income category, got: %v", err)
		}
	})

	t.Run("fails when amount is zero or negative", func(t *testing.T) {
		b := &domain.Budget{
			UserID:      userID,
			CategoryID:  catExpenseID,
			PeriodStart: time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC),
			Amount:      0,
		}
		_, err := uc.Upsert(ctx, b)
		if !errors.Is(err, domain.ErrInvalidAmount) {
			t.Errorf("expected ErrInvalidAmount, got: %v", err)
		}
	})
}

func TestBudgetUsecase_ListByMonth(t *testing.T) {
	userID := "user-123"
	catRepo := &mockCategoryRepo{categories: map[string]*domain.Category{}}
	budgetRepo := newMockBudgetRepo()
	uc := usecase.NewBudgetUsecase(budgetRepo, catRepo)
	ctx := context.Background()

	month := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	budgetRepo.budgets[userID+":cat-1:2026-11-01"] = &domain.Budget{
		ID:           "b-1",
		UserID:       userID,
		CategoryID:   "cat-1",
		CategoryType: domain.TransactionTypeExpense,
		PeriodStart:  month,
		Amount:       1000000,
	}
	budgetRepo.spent["cat-1"] = 350000

	t.Run("returns budgets with calculated spent and remaining", func(t *testing.T) {
		res, err := uc.ListByMonth(ctx, userID, month)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res) != 1 {
			t.Fatalf("expected 1 budget, got %d", len(res))
		}
		if res[0].Amount != 1000000 {
			t.Errorf("expected amount 1000000, got %d", res[0].Amount)
		}
		if res[0].Spent != 350000 {
			t.Errorf("expected spent 350000, got %d", res[0].Spent)
		}
		if res[0].Remaining != 650000 {
			t.Errorf("expected remaining 650000, got %d", res[0].Remaining)
		}
	})

	t.Run("default to current month when zero date provided", func(t *testing.T) {
		_, err := uc.ListByMonth(ctx, userID, time.Time{})
		if err != nil {
			t.Fatalf("unexpected error for zero date: %v", err)
		}
	})

	t.Run("fails when userID is empty", func(t *testing.T) {
		_, err := uc.ListByMonth(ctx, "", month)
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got: %v", err)
		}
	})
}

package usecase_test

import (
	"context"
	"testing"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

func TestFinanceUsecase(t *testing.T) {
	userID := "user-fin-1"

	accRepo := &mockAccountRepo{
		accounts: map[string]*domain.Account{
			"acc-1": {ID: "acc-1", UserID: userID, Name: "Bank BCA", OpeningBalance: 5000000},
			"acc-2": {ID: "acc-2", UserID: "other-user", Name: "Other BCA"},
		},
	}
	catRepo := &mockCategoryRepo{
		categories: map[string]*domain.Category{
			"cat-1": {ID: "cat-1", UserID: userID, Name: "Makan", Type: domain.TransactionTypeExpense},
		},
	}
	txRepo := newMockTransactionRepo()
	txRepo.snapshotTotalBalance = 5200000
	txRepo.snapshotIncome = 1000000
	txRepo.snapshotExpense = 800000

	uc := usecase.NewFinanceUsecase(accRepo, catRepo, txRepo)
	ctx := context.Background()

	t.Run("ListAccounts scopes by user", func(t *testing.T) {
		accs, err := uc.ListAccounts(ctx, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(accs) != 1 {
			t.Fatalf("expected 1 account, got %d", len(accs))
		}
		if accs[0].ID != "acc-1" {
			t.Errorf("expected acc-1, got %s", accs[0].ID)
		}
	})

	t.Run("ListCategories scopes by user", func(t *testing.T) {
		cats, err := uc.ListCategories(ctx, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(cats) != 1 {
			t.Fatalf("expected 1 category, got %d", len(cats))
		}
		if cats[0].ID != "cat-1" {
			t.Errorf("expected cat-1, got %s", cats[0].ID)
		}
	})

	t.Run("GetSnapshot returns snapshot with int64 values", func(t *testing.T) {
		snap, err := uc.GetSnapshot(ctx, userID)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if snap.TotalBalance != 5200000 {
			t.Errorf("expected TotalBalance 5200000, got %d", snap.TotalBalance)
		}
		if snap.MonthlyIncome != 1000000 {
			t.Errorf("expected MonthlyIncome 1000000, got %d", snap.MonthlyIncome)
		}
		if snap.MonthlyExpense != 800000 {
			t.Errorf("expected MonthlyExpense 800000, got %d", snap.MonthlyExpense)
		}
	})
}

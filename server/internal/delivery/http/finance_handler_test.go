package http_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	delivery "finara/server/internal/delivery/http"
	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockFinanceUsecase struct {
	listAccountsFunc   func(ctx context.Context, userID string) ([]domain.Account, error)
	listCategoriesFunc func(ctx context.Context, userID string) ([]domain.Category, error)
	getSnapshotFunc    func(ctx context.Context, userID string) (*domain.FinancialSnapshot, error)
}

func (m *mockFinanceUsecase) ListAccounts(ctx context.Context, userID string) ([]domain.Account, error) {
	if m.listAccountsFunc != nil {
		return m.listAccountsFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockFinanceUsecase) ListCategories(ctx context.Context, userID string) ([]domain.Category, error) {
	if m.listCategoriesFunc != nil {
		return m.listCategoriesFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockFinanceUsecase) GetSnapshot(ctx context.Context, userID string) (*domain.FinancialSnapshot, error) {
	if m.getSnapshotFunc != nil {
		return m.getSnapshotFunc(ctx, userID)
	}
	return nil, nil
}

func setupFinanceEcho(uc usecase.FinanceUsecase, userID string) *echo.Echo {
	e := echo.New()
	handler := delivery.NewFinanceHandler(uc)
	apiGroup := e.Group("/api")
	handler.RegisterRoutes(apiGroup, dummyAuthMiddleware(userID))
	return e
}

func TestFinanceHandler(t *testing.T) {
	mockUC := &mockFinanceUsecase{
		listAccountsFunc: func(ctx context.Context, userID string) ([]domain.Account, error) {
			return []domain.Account{
				{ID: "acc-1", Name: "BCA", OpeningBalance: 2000000},
			}, nil
		},
		listCategoriesFunc: func(ctx context.Context, userID string) ([]domain.Category, error) {
			return []domain.Category{
				{ID: "cat-1", Name: "Transport", Type: domain.TransactionTypeExpense},
			}, nil
		},
		getSnapshotFunc: func(ctx context.Context, userID string) (*domain.FinancialSnapshot, error) {
			return &domain.FinancialSnapshot{
				TotalBalance:   3500000,
				MonthlyIncome:  5000000,
				MonthlyExpense: 1500000,
			}, nil
		},
	}

	e := setupFinanceEcho(mockUC, "user-1")

	t.Run("GET /api/accounts returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/accounts", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var accs []domain.Account
		if err := json.Unmarshal(rec.Body.Bytes(), &accs); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if len(accs) != 1 || accs[0].Name != "BCA" {
			t.Errorf("unexpected accounts response: %+v", accs)
		}
	})

	t.Run("GET /api/categories returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/categories", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var cats []domain.Category
		if err := json.Unmarshal(rec.Body.Bytes(), &cats); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if len(cats) != 1 || cats[0].Name != "Transport" {
			t.Errorf("unexpected categories response: %+v", cats)
		}
	})

	t.Run("GET /api/finance/snapshot returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/finance/snapshot", nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var snap domain.FinancialSnapshot
		if err := json.Unmarshal(rec.Body.Bytes(), &snap); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if snap.TotalBalance != 3500000 || snap.MonthlyIncome != 5000000 || snap.MonthlyExpense != 1500000 {
			t.Errorf("unexpected snapshot response: %+v", snap)
		}
	})
}

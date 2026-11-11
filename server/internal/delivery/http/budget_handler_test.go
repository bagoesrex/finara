package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"

	delivery "finara/server/internal/delivery/http"
	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockBudgetUsecase struct {
	upsertFunc      func(ctx context.Context, budget *domain.Budget) (*domain.Budget, error)
	listByMonthFunc func(ctx context.Context, userID string, month time.Time) ([]domain.BudgetWithProgress, error)
}

func (m *mockBudgetUsecase) Upsert(ctx context.Context, budget *domain.Budget) (*domain.Budget, error) {
	if m.upsertFunc != nil {
		return m.upsertFunc(ctx, budget)
	}
	return budget, nil
}

func (m *mockBudgetUsecase) ListByMonth(ctx context.Context, userID string, month time.Time) ([]domain.BudgetWithProgress, error) {
	if m.listByMonthFunc != nil {
		return m.listByMonthFunc(ctx, userID, month)
	}
	return nil, nil
}

func setupBudgetEcho(uc usecase.BudgetUsecase, userID string) *echo.Echo {
	e := echo.New()
	handler := delivery.NewBudgetHandler(uc)
	apiGroup := e.Group("/api")
	handler.RegisterRoutes(apiGroup, dummyAuthMiddleware(userID))
	return e
}

func TestBudgetHandler_Upsert(t *testing.T) {
	t.Run("success returns 200", func(t *testing.T) {
		mockUC := &mockBudgetUsecase{
			upsertFunc: func(ctx context.Context, budget *domain.Budget) (*domain.Budget, error) {
				budget.ID = "b-upserted-1"
				return budget, nil
			},
		}

		e := setupBudgetEcho(mockUC, "user-1")
		body := `{"category_id":"cat-1","month":"2026-11","amount":750000}`
		req := httptest.NewRequest(http.MethodPost, "/api/budgets", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var resp domain.Budget
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if resp.ID != "b-upserted-1" || resp.Amount != 750000 {
			t.Errorf("unexpected budget response: %+v", resp)
		}
	})

	t.Run("invalid amount returns 400", func(t *testing.T) {
		e := setupBudgetEcho(&mockBudgetUsecase{}, "user-1")
		body := `{"category_id":"cat-1","month":"2026-11","amount":0}`
		req := httptest.NewRequest(http.MethodPost, "/api/budgets", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("invalid month returns 400", func(t *testing.T) {
		e := setupBudgetEcho(&mockBudgetUsecase{}, "user-1")
		body := `{"category_id":"cat-1","month":"invalid-month","amount":50000}`
		req := httptest.NewRequest(http.MethodPost, "/api/budgets", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})
}

func TestBudgetHandler_List(t *testing.T) {
	t.Run("success returns 200 with list", func(t *testing.T) {
		mockUC := &mockBudgetUsecase{
			listByMonthFunc: func(ctx context.Context, userID string, month time.Time) ([]domain.BudgetWithProgress, error) {
				return []domain.BudgetWithProgress{
					{
						Budget: domain.Budget{
							ID:          "b-1",
							CategoryID:  "cat-1",
							Amount:      1000000,
							PeriodStart: month,
						},
						CategoryName: "Makanan",
						Spent:        300000,
						Remaining:    700000,
					},
				}, nil
			},
		}

		e := setupBudgetEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodGet, "/api/budgets?month=2026-11", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var resp []domain.BudgetWithProgress
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if len(resp) != 1 || resp[0].Remaining != 700000 {
			t.Errorf("unexpected list response: %+v", resp)
		}
	})
}

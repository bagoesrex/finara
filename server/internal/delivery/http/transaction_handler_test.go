package http_test

import (
	"bytes"
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

type mockTxUsecase struct {
	createFunc  func(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error)
	getByIDFunc func(ctx context.Context, userID, txID string) (*domain.Transaction, error)
	listFunc    func(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error)
	updateFunc  func(ctx context.Context, userID, txID string, input usecase.UpdateTransactionInput) (*domain.Transaction, error)
	deleteFunc  func(ctx context.Context, userID, txID string) error
}

func (m *mockTxUsecase) Create(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error) {
	if m.createFunc != nil {
		return m.createFunc(ctx, tx)
	}
	return tx, nil
}

func (m *mockTxUsecase) GetByID(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, userID, txID)
	}
	return nil, nil
}

func (m *mockTxUsecase) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error) {
	if m.listFunc != nil {
		return m.listFunc(ctx, filter)
	}
	return nil, nil
}

func (m *mockTxUsecase) Update(ctx context.Context, userID, txID string, input usecase.UpdateTransactionInput) (*domain.Transaction, error) {
	if m.updateFunc != nil {
		return m.updateFunc(ctx, userID, txID, input)
	}
	return nil, nil
}

func (m *mockTxUsecase) Delete(ctx context.Context, userID, txID string) error {
	if m.deleteFunc != nil {
		return m.deleteFunc(ctx, userID, txID)
	}
	return nil
}

func dummyAuthMiddleware(userID string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if userID != "" {
				c.Set("user_id", userID)
			}
			return next(c)
		}
	}
}

func setupTxEcho(uc usecase.TransactionUsecase, userID string) *echo.Echo {
	e := echo.New()
	handler := delivery.NewTransactionHandler(uc)
	apiGroup := e.Group("/api")
	handler.RegisterRoutes(apiGroup, dummyAuthMiddleware(userID))
	return e
}

func TestTransactionHandler_Create(t *testing.T) {
	t.Run("success returns 201", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			createFunc: func(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error) {
				tx.ID = "tx-created-1"
				tx.AccountName = "Dompet"
				tx.CategoryName = "Makan"
				return tx, nil
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		body := `{
			"account_id": "acc-1",
			"category_id": "cat-1",
			"type": "EXPENSE",
			"amount": 45000,
			"description": "Nasi Goreng",
			"transaction_date": "2026-11-12",
			"client_request_id": "req-uuid-1"
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
		}

		var resp domain.Transaction
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if resp.ID != "tx-created-1" || resp.Amount != 45000 {
			t.Errorf("unexpected transaction: %+v", resp)
		}
	})

	t.Run("unauthorized when no user_id in context", func(t *testing.T) {
		e := setupTxEcho(&mockTxUsecase{}, "")
		body := `{"amount": 1000}`
		req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("invalid json returns 400", func(t *testing.T) {
		e := setupTxEcho(&mockTxUsecase{}, "user-1")
		req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewBufferString("invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("invalid date returns 400", func(t *testing.T) {
		e := setupTxEcho(&mockTxUsecase{}, "user-1")
		body := `{
			"account_id": "acc-1",
			"category_id": "cat-1",
			"type": "EXPENSE",
			"amount": 45000,
			"description": "Nasi Goreng",
			"transaction_date": "not-a-date",
			"client_request_id": "req-uuid-1"
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("account not found returns 404", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			createFunc: func(ctx context.Context, tx *domain.Transaction) (*domain.Transaction, error) {
				return nil, domain.ErrAccountNotFound
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		body := `{
			"account_id": "acc-none",
			"category_id": "cat-1",
			"type": "EXPENSE",
			"amount": 45000,
			"description": "Nasi Goreng",
			"transaction_date": "2026-11-12",
			"client_request_id": "req-uuid-2"
		}`
		req := httptest.NewRequest(http.MethodPost, "/api/transactions", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", rec.Code)
		}
	})
}

func TestTransactionHandler_List(t *testing.T) {
	t.Run("success returns 200 with list", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			listFunc: func(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error) {
				if filter.Search != "coffee" {
					t.Errorf("expected search filter 'coffee', got '%s'", filter.Search)
				}
				return []domain.Transaction{
					{ID: "tx-1", Description: "coffee latte", Amount: 30000},
				}, nil
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodGet, "/api/transactions?search=coffee&limit=10", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}

		var resp []domain.Transaction
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if len(resp) != 1 || resp[0].ID != "tx-1" {
			t.Errorf("unexpected list response: %+v", resp)
		}
	})
}

func TestTransactionHandler_GetByID(t *testing.T) {
	t.Run("found returns 200", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			getByIDFunc: func(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
				return &domain.Transaction{ID: txID, Amount: 50000}, nil
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodGet, "/api/transactions/tx-123", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			getByIDFunc: func(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
				return nil, domain.ErrNotFound
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodGet, "/api/transactions/tx-nonexistent", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", rec.Code)
		}
	})
}

func TestTransactionHandler_Update(t *testing.T) {
	t.Run("success returns 200", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			updateFunc: func(ctx context.Context, userID, txID string, input usecase.UpdateTransactionInput) (*domain.Transaction, error) {
				return &domain.Transaction{ID: txID, Amount: *input.Amount, Description: *input.Description}, nil
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		body := `{"amount": 75000, "description": "Updated Dinner"}`
		req := httptest.NewRequest(http.MethodPatch, "/api/transactions/tx-1", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			updateFunc: func(ctx context.Context, userID, txID string, input usecase.UpdateTransactionInput) (*domain.Transaction, error) {
				return nil, domain.ErrNotFound
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		body := `{"amount": 75000}`
		req := httptest.NewRequest(http.MethodPatch, "/api/transactions/tx-unknown", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", rec.Code)
		}
	})
}

func TestTransactionHandler_Delete(t *testing.T) {
	t.Run("success returns 200", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			deleteFunc: func(ctx context.Context, userID, txID string) error {
				return nil
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodDelete, "/api/transactions/tx-1", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("not found returns 404", func(t *testing.T) {
		mockUC := &mockTxUsecase{
			deleteFunc: func(ctx context.Context, userID, txID string) error {
				return domain.ErrNotFound
			},
		}

		e := setupTxEcho(mockUC, "user-1")
		req := httptest.NewRequest(http.MethodDelete, "/api/transactions/tx-unknown", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", rec.Code)
		}
	})
}

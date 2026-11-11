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

type mockAIUsecase struct {
	parseFunc func(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error)
}

func (m *mockAIUsecase) ParseTransaction(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error) {
	if m.parseFunc != nil {
		return m.parseFunc(ctx, userID, prompt)
	}
	return nil, nil
}

func setupAIEcho(uc usecase.AIUsecase, userID string) *echo.Echo {
	e := echo.New()
	handler := delivery.NewAIHandler(uc)
	apiGroup := e.Group("/api")
	handler.RegisterRoutes(apiGroup, dummyAuthMiddleware(userID))
	return e
}

func TestAIHandler_ParseTransaction(t *testing.T) {
	t.Run("success returns 200 with draft", func(t *testing.T) {
		mockUC := &mockAIUsecase{
			parseFunc: func(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error) {
				return &domain.ParsedTransactionDraft{
					Amount:          25000,
					Type:            domain.TransactionTypeExpense,
					CategoryID:      "cat-food",
					AccountID:       "acc-cash",
					Description:     "Makan padang",
					TransactionDate: "2026-11-12",
				}, nil
			},
		}

		e := setupAIEcho(mockUC, "user-1")
		body := `{"prompt": "makan padang 25rb"}`
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp struct {
			Draft domain.ParsedTransactionDraft `json:"draft"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if resp.Draft.Amount != 25000 || resp.Draft.Description != "Makan padang" {
			t.Errorf("unexpected draft content: %+v", resp.Draft)
		}
	})

	t.Run("missing user_id returns 401", func(t *testing.T) {
		e := setupAIEcho(&mockAIUsecase{}, "") // no user_id in context
		body := `{"prompt": "makan padang 25rb"}`
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("empty prompt returns 400", func(t *testing.T) {
		e := setupAIEcho(&mockAIUsecase{}, "user-1")
		body := `{"prompt": "   "}`
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("invalid json returns 400", func(t *testing.T) {
		e := setupAIEcho(&mockAIUsecase{}, "user-1")
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString("invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rec.Code)
		}
	})

	t.Run("rate limit exceeded returns 429", func(t *testing.T) {
		mockUC := &mockAIUsecase{
			parseFunc: func(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error) {
				return nil, domain.ErrRateLimitExceeded
			},
		}

		e := setupAIEcho(mockUC, "user-1")
		body := `{"prompt": "makan padang 25rb"}`
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusTooManyRequests {
			t.Fatalf("expected 429, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})

	t.Run("ai timeout / failure returns 503 with friendly message", func(t *testing.T) {
		mockUC := &mockAIUsecase{
			parseFunc: func(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error) {
				return nil, domain.ErrAIServiceUnavailable
			},
		}

		e := setupAIEcho(mockUC, "user-1")
		body := `{"prompt": "makan padang 25rb"}`
		req := httptest.NewRequest(http.MethodPost, "/api/ai/parse-transaction", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d. Body: %s", rec.Code, rec.Body.String())
		}

		var resp map[string]string
		_ = json.Unmarshal(rec.Body.Bytes(), &resp)
		if resp["error"] != "Gagal memproses draf, silakan coba lagi atau input manual" {
			t.Errorf("expected clean friendly message, got: %q", resp["error"])
		}
	})
}

package http_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"

	delivery "finara/server/internal/delivery/http"
	"finara/server/internal/delivery/http/middleware"
	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockAuthUsecase struct {
	registerFunc      func(ctx context.Context, input usecase.RegisterInput) (*usecase.AuthResult, error)
	loginFunc         func(ctx context.Context, input usecase.LoginInput) (*usecase.AuthResult, error)
	getMeFunc         func(ctx context.Context, userID string) (*domain.User, error)
	logoutFunc        func(ctx context.Context, token string) error
	validateTokenFunc func(ctx context.Context, token string) (*domain.User, error)
}

func (m *mockAuthUsecase) Register(ctx context.Context, input usecase.RegisterInput) (*usecase.AuthResult, error) {
	if m.registerFunc != nil {
		return m.registerFunc(ctx, input)
	}
	return nil, nil
}

func (m *mockAuthUsecase) Login(ctx context.Context, input usecase.LoginInput) (*usecase.AuthResult, error) {
	if m.loginFunc != nil {
		return m.loginFunc(ctx, input)
	}
	return nil, nil
}

func (m *mockAuthUsecase) GetMe(ctx context.Context, userID string) (*domain.User, error) {
	if m.getMeFunc != nil {
		return m.getMeFunc(ctx, userID)
	}
	return nil, nil
}

func (m *mockAuthUsecase) Logout(ctx context.Context, token string) error {
	if m.logoutFunc != nil {
		return m.logoutFunc(ctx, token)
	}
	return nil
}

func (m *mockAuthUsecase) ValidateToken(ctx context.Context, token string) (*domain.User, error) {
	if m.validateTokenFunc != nil {
		return m.validateTokenFunc(ctx, token)
	}
	return nil, nil
}

func setupEcho(uc usecase.AuthUsecase) *echo.Echo {
	e := echo.New()
	handler := delivery.NewAuthHandler(uc)
	authMiddleware := middleware.NewAuthMiddleware(uc)
	group := e.Group("/api/auth")
	handler.RegisterRoutes(group, authMiddleware)
	return e
}

func TestRegisterHandler(t *testing.T) {
	t.Run("success returns 201", func(t *testing.T) {
		mockUC := &mockAuthUsecase{
			registerFunc: func(ctx context.Context, input usecase.RegisterInput) (*usecase.AuthResult, error) {
				return &usecase.AuthResult{
					Token: "tok-123",
					User: &domain.User{
						ID:    "usr-1",
						Name:  input.Name,
						Email: input.Email,
					},
				}, nil
			},
		}

		e := setupEcho(mockUC)
		body := `{"name":"Budi","email":"budi@example.com","password":"password123"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusCreated {
			t.Fatalf("expected status 201, got: %d", rec.Code)
		}

		var resp delivery.AuthResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal response: %v", err)
		}

		if resp.Token != "tok-123" || resp.User.ID != "usr-1" || resp.User.Name != "Budi" || resp.User.Email != "budi@example.com" {
			t.Fatalf("unexpected response payload: %+v", resp)
		}
	})

	t.Run("conflict returns 409", func(t *testing.T) {
		mockUC := &mockAuthUsecase{
			registerFunc: func(ctx context.Context, input usecase.RegisterInput) (*usecase.AuthResult, error) {
				return nil, domain.ErrConflict
			},
		}

		e := setupEcho(mockUC)
		body := `{"name":"Budi","email":"budi@example.com","password":"password123"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusConflict {
			t.Fatalf("expected status 409, got: %d", rec.Code)
		}
	})

	t.Run("validation failure returns 400", func(t *testing.T) {
		mockUC := &mockAuthUsecase{
			registerFunc: func(ctx context.Context, input usecase.RegisterInput) (*usecase.AuthResult, error) {
				return nil, domain.ErrInvalidInput
			},
		}

		e := setupEcho(mockUC)
		body := `{"name":"","email":"bad","password":"short"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got: %d", rec.Code)
		}
	})

	t.Run("invalid json returns 400", func(t *testing.T) {
		e := setupEcho(&mockAuthUsecase{})
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString("invalid json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400, got: %d", rec.Code)
		}
	})
}

func TestLoginHandler(t *testing.T) {
	t.Run("success returns 200", func(t *testing.T) {
		mockUC := &mockAuthUsecase{
			loginFunc: func(ctx context.Context, input usecase.LoginInput) (*usecase.AuthResult, error) {
				return &usecase.AuthResult{
					Token: "tok-456",
					User: &domain.User{
						ID:    "usr-2",
						Name:  "Dewi",
						Email: input.Email,
					},
				}, nil
			},
		}

		e := setupEcho(mockUC)
		body := `{"email":"dewi@example.com","password":"secretpassword"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got: %d", rec.Code)
		}

		var resp delivery.AuthResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}

		if resp.Token != "tok-456" || resp.User.ID != "usr-2" {
			t.Fatalf("unexpected response: %+v", resp)
		}
	})

	t.Run("unauthorized returns 401", func(t *testing.T) {
		mockUC := &mockAuthUsecase{
			loginFunc: func(ctx context.Context, input usecase.LoginInput) (*usecase.AuthResult, error) {
				return nil, domain.ErrUnauthorized
			},
		}

		e := setupEcho(mockUC)
		body := `{"email":"dewi@example.com","password":"wrongpassword"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got: %d", rec.Code)
		}
	})
}

func TestMeHandler(t *testing.T) {
	mockUC := &mockAuthUsecase{
		validateTokenFunc: func(ctx context.Context, token string) (*domain.User, error) {
			if token == "valid-token" {
				return &domain.User{ID: "usr-3", Name: "Andi", Email: "andi@example.com"}, nil
			}
			return nil, domain.ErrUnauthorized
		},
		getMeFunc: func(ctx context.Context, userID string) (*domain.User, error) {
			if userID == "usr-3" {
				return &domain.User{ID: "usr-3", Name: "Andi", Email: "andi@example.com"}, nil
			}
			return nil, domain.ErrNotFound
		},
	}

	e := setupEcho(mockUC)

	t.Run("success returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got: %d", rec.Code)
		}

		var resp delivery.MeResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if resp.User.ID != "usr-3" || resp.User.Name != "Andi" || resp.User.Email != "andi@example.com" {
			t.Fatalf("unexpected user payload: %+v", resp)
		}
	})

	t.Run("missing auth header returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got: %d", rec.Code)
		}
	})

	t.Run("invalid auth header format returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.Header.Set("Authorization", "InvalidFormat")
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got: %d", rec.Code)
		}
	})

	t.Run("invalid token returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got: %d", rec.Code)
		}
	})
}

func TestLogoutHandler(t *testing.T) {
	var loggedOutToken string
	mockUC := &mockAuthUsecase{
		validateTokenFunc: func(ctx context.Context, token string) (*domain.User, error) {
			if token == "valid-token" {
				return &domain.User{ID: "usr-4", Name: "Siti", Email: "siti@example.com"}, nil
			}
			return nil, domain.ErrUnauthorized
		},
		logoutFunc: func(ctx context.Context, token string) error {
			loggedOutToken = token
			return nil
		},
	}

	e := setupEcho(mockUC)

	t.Run("success returns 200", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
		req.Header.Set("Authorization", "Bearer valid-token")
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got: %d", rec.Code)
		}
		if loggedOutToken != "valid-token" {
			t.Fatalf("expected logged out token 'valid-token', got: %s", loggedOutToken)
		}

		var resp delivery.LogoutResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to unmarshal: %v", err)
		}
		if resp.Message != "logged out" {
			t.Fatalf("unexpected message: %s", resp.Message)
		}
	})

	t.Run("missing auth header returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got: %d", rec.Code)
		}
	})
}

func TestRespondError(t *testing.T) {
	e := echo.New()

	tests := []struct {
		err          error
		expectedCode int
	}{
		{domain.ErrInvalidInput, http.StatusBadRequest},
		{domain.ErrInvalidAmount, http.StatusBadRequest},
		{domain.ErrUnauthorized, http.StatusUnauthorized},
		{domain.ErrNotFound, http.StatusNotFound},
		{domain.ErrAccountNotFound, http.StatusNotFound},
		{domain.ErrCategoryNotFound, http.StatusNotFound},
		{domain.ErrConflict, http.StatusConflict},
		{domain.ErrDuplicateRequest, http.StatusConflict},
		{domain.ErrRateLimitExceeded, http.StatusTooManyRequests},
		{domain.ErrAIServiceUnavailable, http.StatusServiceUnavailable},
		{errors.New("db connection failed"), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		_ = delivery.RespondError(c, tt.err)
		if rec.Code != tt.expectedCode {
			t.Errorf("error %v: expected status %d, got %d", tt.err, tt.expectedCode, rec.Code)
		}
	}
}

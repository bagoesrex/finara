package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockUserRepo struct {
	createFunc            func(ctx context.Context, user *domain.User) error
	getByIDFunc           func(ctx context.Context, id string) (*domain.User, error)
	getByEmailFunc         func(ctx context.Context, email string) (*domain.User, error)
	createSessionFunc     func(ctx context.Context, session *domain.Session) error
	getSessionByTokenFunc func(ctx context.Context, token string) (*domain.Session, error)
	deleteSessionFunc     func(ctx context.Context, token string) error
	registerAtomicFunc    func(ctx context.Context, user *domain.User, session *domain.Session, defaultAccount *domain.Account, defaultCategories []domain.Category) error
}

func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error {
	if m.createFunc != nil {
		return m.createFunc(ctx, user)
	}
	return nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if m.getByIDFunc != nil {
		return m.getByIDFunc(ctx, id)
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	if m.getByEmailFunc != nil {
		return m.getByEmailFunc(ctx, email)
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) CreateSession(ctx context.Context, session *domain.Session) error {
	if m.createSessionFunc != nil {
		return m.createSessionFunc(ctx, session)
	}
	return nil
}

func (m *mockUserRepo) GetSessionByToken(ctx context.Context, token string) (*domain.Session, error) {
	if m.getSessionByTokenFunc != nil {
		return m.getSessionByTokenFunc(ctx, token)
	}
	return nil, domain.ErrNotFound
}

func (m *mockUserRepo) DeleteSession(ctx context.Context, token string) error {
	if m.deleteSessionFunc != nil {
		return m.deleteSessionFunc(ctx, token)
	}
	return nil
}

func (m *mockUserRepo) RegisterAtomic(ctx context.Context, user *domain.User, session *domain.Session, defaultAccount *domain.Account, defaultCategories []domain.Category) error {
	if m.registerAtomicFunc != nil {
		return m.registerAtomicFunc(ctx, user, session, defaultAccount, defaultCategories)
	}
	return nil
}

func TestRegister_Success(t *testing.T) {
	ctx := context.Background()
	var capturedUser *domain.User
	var capturedSession *domain.Session
	var capturedAccount *domain.Account
	var capturedCategories []domain.Category

	repo := &mockUserRepo{
		registerAtomicFunc: func(ctx context.Context, user *domain.User, session *domain.Session, defaultAccount *domain.Account, defaultCategories []domain.Category) error {
			userCopy := *user
			capturedUser = &userCopy
			capturedSession = session
			capturedAccount = defaultAccount
			capturedCategories = defaultCategories
			user.ID = "usr-123"
			return nil
		},
	}

	uc := usecase.NewAuthUsecase(repo)
	res, err := uc.Register(ctx, usecase.RegisterInput{
		Name:     "Budi Raharjo",
		Email:    "budi@example.com",
		Password: "password123",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Token == "" {
		t.Fatalf("expected non-empty token")
	}
	if res.User == nil || res.User.ID != "usr-123" {
		t.Fatalf("expected user with id usr-123, got: %+v", res.User)
	}
	if res.User.PasswordHash != "" {
		t.Fatalf("expected password hash to be stripped in result, got: %s", res.User.PasswordHash)
	}

	// Verify captured atomic entities
	if capturedUser.Name != "Budi Raharjo" || capturedUser.Email != "budi@example.com" {
		t.Fatalf("unexpected captured user: %+v", capturedUser)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(capturedUser.PasswordHash), []byte("password123")); err != nil {
		t.Fatalf("stored password hash mismatch: %v", err)
	}

	if capturedSession.Token != res.Token {
		t.Fatalf("session token mismatch")
	}
	if time.Until(capturedSession.ExpiresAt) < 29*24*time.Hour {
		t.Fatalf("expected session expiry ~30 days, got: %v", capturedSession.ExpiresAt)
	}

	if capturedAccount == nil || capturedAccount.Name != "Tunai" || capturedAccount.Type != domain.AccountTypeCash || capturedAccount.OpeningBalance != 0 {
		t.Fatalf("unexpected default account: %+v", capturedAccount)
	}

	if len(capturedCategories) != 10 {
		t.Fatalf("expected 10 default categories, got: %d", len(capturedCategories))
	}

	expenseCount := 0
	incomeCount := 0
	for _, cat := range capturedCategories {
		if cat.Type == domain.TransactionTypeExpense {
			expenseCount++
		} else if cat.Type == domain.TransactionTypeIncome {
			incomeCount++
		}
	}
	if expenseCount != 6 || incomeCount != 4 {
		t.Fatalf("expected 6 expense and 4 income categories, got %d expense, %d income", expenseCount, incomeCount)
	}
}

func TestRegister_ValidationErrors(t *testing.T) {
	ctx := context.Background()
	uc := usecase.NewAuthUsecase(&mockUserRepo{})

	tests := []struct {
		name  string
		input usecase.RegisterInput
	}{
		{"empty name", usecase.RegisterInput{Name: "", Email: "test@example.com", Password: "password123"}},
		{"whitespace name", usecase.RegisterInput{Name: "   ", Email: "test@example.com", Password: "password123"}},
		{"empty email", usecase.RegisterInput{Name: "User", Email: "", Password: "password123"}},
		{"invalid email plain", usecase.RegisterInput{Name: "User", Email: "notanemail", Password: "password123"}},
		{"invalid email no user", usecase.RegisterInput{Name: "User", Email: "@example.com", Password: "password123"}},
		{"invalid email no domain", usecase.RegisterInput{Name: "User", Email: "user@", Password: "password123"}},
		{"invalid email no tld", usecase.RegisterInput{Name: "User", Email: "user@localhost", Password: "password123"}},
		{"password too short", usecase.RegisterInput{Name: "User", Email: "test@example.com", Password: "short"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := uc.Register(ctx, tt.input)
			if !errors.Is(err, domain.ErrInvalidInput) {
				t.Fatalf("expected ErrInvalidInput, got: %v", err)
			}
		})
	}
}

func TestRegister_Conflict(t *testing.T) {
	ctx := context.Background()
	repo := &mockUserRepo{
		registerAtomicFunc: func(ctx context.Context, user *domain.User, session *domain.Session, defaultAccount *domain.Account, defaultCategories []domain.Category) error {
			return domain.ErrConflict
		},
	}
	uc := usecase.NewAuthUsecase(repo)
	_, err := uc.Register(ctx, usecase.RegisterInput{
		Name:     "Existing User",
		Email:    "existing@example.com",
		Password: "password123",
	})
	if !errors.Is(err, domain.ErrConflict) {
		t.Fatalf("expected ErrConflict, got: %v", err)
	}
}

func TestLogin_Success(t *testing.T) {
	ctx := context.Background()
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret123"), 10)
	user := &domain.User{
		ID:           "u-1",
		Email:        "budi@example.com",
		PasswordHash: string(hash),
		Name:         "Budi",
	}

	var savedSession *domain.Session
	repo := &mockUserRepo{
		getByEmailFunc: func(ctx context.Context, email string) (*domain.User, error) {
			if email == "budi@example.com" {
				return user, nil
			}
			return nil, domain.ErrNotFound
		},
		createSessionFunc: func(ctx context.Context, session *domain.Session) error {
			savedSession = session
			return nil
		},
	}

	uc := usecase.NewAuthUsecase(repo)
	res, err := uc.Login(ctx, usecase.LoginInput{
		Email:    "budi@example.com",
		Password: "secret123",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if res.Token == "" {
		t.Fatalf("expected non-empty token")
	}
	if res.User.ID != "u-1" || res.User.PasswordHash != "" {
		t.Fatalf("unexpected user in auth result: %+v", res.User)
	}
	if savedSession == nil || savedSession.UserID != "u-1" || savedSession.Token != res.Token {
		t.Fatalf("session not saved properly: %+v", savedSession)
	}
}

func TestLogin_Failures(t *testing.T) {
	ctx := context.Background()
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret123"), 10)
	user := &domain.User{
		ID:           "u-1",
		Email:        "budi@example.com",
		PasswordHash: string(hash),
		Name:         "Budi",
	}

	repo := &mockUserRepo{
		getByEmailFunc: func(ctx context.Context, email string) (*domain.User, error) {
			if email == "budi@example.com" {
				return user, nil
			}
			return nil, domain.ErrNotFound
		},
	}

	uc := usecase.NewAuthUsecase(repo)

	t.Run("empty email", func(t *testing.T) {
		_, err := uc.Login(ctx, usecase.LoginInput{Email: "", Password: "secret123"})
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("empty password", func(t *testing.T) {
		_, err := uc.Login(ctx, usecase.LoginInput{Email: "budi@example.com", Password: ""})
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		_, err := uc.Login(ctx, usecase.LoginInput{Email: "notfound@example.com", Password: "secret123"})
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("wrong password", func(t *testing.T) {
		_, err := uc.Login(ctx, usecase.LoginInput{Email: "budi@example.com", Password: "wrongpassword"})
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})
}

func TestGetMe(t *testing.T) {
	ctx := context.Background()
	user := &domain.User{
		ID:           "u-1",
		Email:        "budi@example.com",
		PasswordHash: "secret-hash",
		Name:         "Budi",
	}

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id string) (*domain.User, error) {
			if id == "u-1" {
				return user, nil
			}
			return nil, domain.ErrNotFound
		},
	}

	uc := usecase.NewAuthUsecase(repo)

	t.Run("success", func(t *testing.T) {
		u, err := uc.GetMe(ctx, "u-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if u.ID != "u-1" || u.PasswordHash != "" {
			t.Fatalf("expected user with sanitized password, got: %+v", u)
		}
	})

	t.Run("empty user id", func(t *testing.T) {
		_, err := uc.GetMe(ctx, "")
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("not found", func(t *testing.T) {
		_, err := uc.GetMe(ctx, "u-unknown")
		if !errors.Is(err, domain.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got: %v", err)
		}
	})
}

func TestLogout(t *testing.T) {
	ctx := context.Background()
	var deletedToken string
	repo := &mockUserRepo{
		deleteSessionFunc: func(ctx context.Context, token string) error {
			deletedToken = token
			return nil
		},
	}

	uc := usecase.NewAuthUsecase(repo)

	t.Run("success", func(t *testing.T) {
		err := uc.Logout(ctx, "token-123")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if deletedToken != "token-123" {
			t.Fatalf("expected deleted token 'token-123', got: %s", deletedToken)
		}
	})

	t.Run("empty token", func(t *testing.T) {
		err := uc.Logout(ctx, "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	})
}

func TestValidateToken(t *testing.T) {
	ctx := context.Background()
	user := &domain.User{
		ID:           "u-1",
		Email:        "budi@example.com",
		PasswordHash: "secret-hash",
		Name:         "Budi",
	}

	repo := &mockUserRepo{
		getByIDFunc: func(ctx context.Context, id string) (*domain.User, error) {
			if id == "u-1" {
				return user, nil
			}
			return nil, domain.ErrNotFound
		},
		getSessionByTokenFunc: func(ctx context.Context, token string) (*domain.Session, error) {
			if token == "valid-token" {
				return &domain.Session{
					ID:        "s-1",
					UserID:    "u-1",
					Token:     "valid-token",
					ExpiresAt: time.Now().Add(24 * time.Hour),
				}, nil
			}
			if token == "expired-token" {
				return &domain.Session{
					ID:        "s-2",
					UserID:    "u-1",
					Token:     "expired-token",
					ExpiresAt: time.Now().Add(-1 * time.Hour),
				}, nil
			}
			return nil, domain.ErrNotFound
		},
	}

	uc := usecase.NewAuthUsecase(repo)

	t.Run("valid token", func(t *testing.T) {
		u, err := uc.ValidateToken(ctx, "valid-token")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if u.ID != "u-1" || u.PasswordHash != "" {
			t.Fatalf("expected user with sanitized password, got: %+v", u)
		}
	})

	t.Run("expired token", func(t *testing.T) {
		_, err := uc.ValidateToken(ctx, "expired-token")
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("non-existent token", func(t *testing.T) {
		_, err := uc.ValidateToken(ctx, "unknown-token")
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})

	t.Run("empty token", func(t *testing.T) {
		_, err := uc.ValidateToken(ctx, "")
		if !errors.Is(err, domain.ErrUnauthorized) {
			t.Fatalf("expected ErrUnauthorized, got: %v", err)
		}
	})
}

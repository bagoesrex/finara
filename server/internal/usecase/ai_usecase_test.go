package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockRateLimitRepo struct {
	allowed bool
	err     error
}

func (m *mockRateLimitRepo) Allow(ctx context.Context, userID string, maxRequests int, window time.Duration) (bool, error) {
	if m.err != nil {
		return false, m.err
	}
	return m.allowed, nil
}

type mockChatClient struct {
	response string
	err      error
}

func (m *mockChatClient) CompleteChat(ctx context.Context, systemPrompt, userPrompt string) (string, error) {
	if m.err != nil {
		return "", m.err
	}
	return m.response, nil
}

func TestAIUsecase_ParseTransaction(t *testing.T) {
	userID := "usr-1"
	accounts := []domain.Account{
		{ID: "acc-cash", UserID: userID, Name: "Tunai", Type: domain.AccountTypeCash},
		{ID: "acc-bank", UserID: userID, Name: "BCA", Type: domain.AccountTypeBank},
	}
	categories := []domain.Category{
		{ID: "cat-food", UserID: userID, Name: "Makanan", Type: domain.TransactionTypeExpense},
		{ID: "cat-sal", UserID: userID, Name: "Gaji", Type: domain.TransactionTypeIncome},
	}

	accRepo := &mockAccountRepo{
		accounts: map[string]*domain.Account{
			"acc-cash": &accounts[0],
			"acc-bank": &accounts[1],
		},
	}
	catRepo := &mockCategoryRepo{
		categories: map[string]*domain.Category{
			"cat-food": &categories[0],
			"cat-sal":  &categories[1],
		},
	}

	ctx := context.Background()

	t.Run("successful parse returns draft", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{
			response: `{"amount": 25000, "type": "EXPENSE", "category_id": "cat-food", "account_id": "acc-cash", "description": "Makan padang", "transaction_date": "2026-11-12"}`,
		}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		draft, err := uc.ParseTransaction(ctx, userID, "makan padang 25rb")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if draft.Amount != 25000 {
			t.Errorf("expected amount 25000, got %d", draft.Amount)
		}
		if draft.Type != domain.TransactionTypeExpense {
			t.Errorf("expected EXPENSE, got %s", draft.Type)
		}
		if draft.AccountID != "acc-cash" {
			t.Errorf("expected acc-cash, got %s", draft.AccountID)
		}
		if draft.CategoryID != "cat-food" {
			t.Errorf("expected cat-food, got %s", draft.CategoryID)
		}
		if draft.Description != "Makan padang" {
			t.Errorf("expected 'Makan padang', got %s", draft.Description)
		}
	})

	t.Run("empty prompt returns ErrInvalidInput", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{response: `{}`}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "   ")
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got: %v", err)
		}
	})

	t.Run("empty userID returns ErrInvalidInput", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{response: `{}`}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, "", "makan padang")
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got: %v", err)
		}
	})

	t.Run("rate limit exceeded returns ErrRateLimitExceeded", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: false}
		chatClient := &mockChatClient{response: `{}`}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "makan padang 25rb")
		if !errors.Is(err, domain.ErrRateLimitExceeded) {
			t.Errorf("expected ErrRateLimitExceeded, got: %v", err)
		}
	})

	t.Run("rate limit repo error propagates", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{err: errors.New("db error")}
		chatClient := &mockChatClient{response: `{}`}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "makan padang 25rb")
		if err == nil {
			t.Fatal("expected error, got nil")
		}
	})

	t.Run("chat client timeout or error returns ErrAIServiceUnavailable", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{err: errors.New("upstream timeout")}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "makan padang 25rb")
		if !errors.Is(err, domain.ErrAIServiceUnavailable) {
			t.Errorf("expected ErrAIServiceUnavailable, got: %v", err)
		}
	})

	t.Run("malformed AI response returns ErrAIServiceUnavailable", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{response: "invalid non-json response"}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "makan padang 25rb")
		if !errors.Is(err, domain.ErrAIServiceUnavailable) {
			t.Errorf("expected ErrAIServiceUnavailable, got: %v", err)
		}
	})

	t.Run("ai response with zero amount returns ErrAIServiceUnavailable", func(t *testing.T) {
		rateLimitRepo := &mockRateLimitRepo{allowed: true}
		chatClient := &mockChatClient{
			response: `{"amount": 0, "type": "EXPENSE", "category_id": "cat-food", "account_id": "acc-cash", "description": "gratis"}`,
		}

		uc := usecase.NewAIUsecase(rateLimitRepo, accRepo, catRepo, chatClient)
		_, err := uc.ParseTransaction(ctx, userID, "gratis")
		if !errors.Is(err, domain.ErrAIServiceUnavailable) {
			t.Errorf("expected ErrAIServiceUnavailable, got: %v", err)
		}
	})
}

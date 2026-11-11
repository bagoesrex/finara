package ai_test

import (
	"context"
	"os"
	"testing"
	"time"

	"finara/server/internal/ai"
	"finara/server/internal/domain"
	"github.com/joho/godotenv"
)

func TestLiveAICompletions(t *testing.T) {
	_ = godotenv.Load("../../.env")

	baseURL := os.Getenv("AI_BASE_URL")
	apiKey := os.Getenv("AI_API_KEY")
	model := os.Getenv("AI_MODEL")

	if baseURL == "" || apiKey == "" {
		t.Skip("skipping live AI test: AI_BASE_URL or AI_API_KEY not configured")
	}

	client := ai.NewClient(ai.ClientConfig{
		BaseURL:        baseURL,
		APIKey:         apiKey,
		Model:          model,
		TimeoutSeconds: 30,
	})

	accounts := []domain.Account{
		{ID: "acc-1", Name: "Tunai", Type: domain.AccountTypeCash},
		{ID: "acc-2", Name: "BCA", Type: domain.AccountTypeBank},
	}
	categories := []domain.Category{
		{ID: "cat-1", Name: "Makanan & Minuman", Type: domain.TransactionTypeExpense},
		{ID: "cat-2", Name: "Transportasi", Type: domain.TransactionTypeExpense},
	}

	now := time.Now()
	systemPrompt := ai.FormatSystemPrompt(accounts, categories, now)
	userPrompt := "Beli makan siang nasi padang 25rb bayar tunai"

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()

	resp, err := client.CompleteChat(ctx, systemPrompt, userPrompt)
	if err != nil {
		t.Fatalf("Live CompleteChat failed: %v", err)
	}

	t.Logf("Raw AI Response:\n%s", resp)

	draft, err := ai.ParseTransactionDraft(resp, accounts, categories, userPrompt, now)
	if err != nil {
		t.Fatalf("ParseTransactionDraft failed: %v", err)
	}

	t.Logf("Parsed Draft: Amount=%d, Type=%s, AccountID=%s, CategoryID=%s, Desc=%s, Date=%s",
		draft.Amount, draft.Type, draft.AccountID, draft.CategoryID, draft.Description, draft.TransactionDate)

	if draft.Amount != 25000 {
		t.Errorf("expected amount 25000, got %d", draft.Amount)
	}
	if draft.Type != domain.TransactionTypeExpense {
		t.Errorf("expected EXPENSE, got %s", draft.Type)
	}
	if draft.AccountID != "acc-1" {
		t.Errorf("expected AccountID 'acc-1' (Tunai), got %s", draft.AccountID)
	}
	if draft.CategoryID != "cat-1" {
		t.Errorf("expected CategoryID 'cat-1' (Makanan & Minuman), got %s", draft.CategoryID)
	}
}

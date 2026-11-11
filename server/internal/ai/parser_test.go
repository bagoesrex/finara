package ai_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"finara/server/internal/ai"
	"finara/server/internal/domain"
)

func TestFormatSystemPrompt(t *testing.T) {
	accounts := []domain.Account{
		{ID: "acc-1", Name: "Dompet", Type: domain.AccountTypeCash},
		{ID: "acc-2", Name: "BCA", Type: domain.AccountTypeBank},
	}
	categories := []domain.Category{
		{ID: "cat-1", Name: "Makanan", Type: domain.TransactionTypeExpense},
		{ID: "cat-2", Name: "Gaji", Type: domain.TransactionTypeIncome},
	}

	fixedTime := time.Date(2026, 11, 12, 10, 0, 0, 0, ai.WIB)
	prompt := ai.FormatSystemPrompt(accounts, categories, fixedTime)

	if !strings.Contains(prompt, "2026-11-12") {
		t.Errorf("expected prompt to contain date '2026-11-12', got:\n%s", prompt)
	}
	if !strings.Contains(prompt, "acc-1") || !strings.Contains(prompt, "Dompet") {
		t.Errorf("expected prompt to contain account 'acc-1', got:\n%s", prompt)
	}
	if !strings.Contains(prompt, "cat-1") || !strings.Contains(prompt, "Makanan") {
		t.Errorf("expected prompt to contain category 'cat-1', got:\n%s", prompt)
	}
}

func TestStripEmojis(t *testing.T) {
	input := "Makan nasi padang 🍛 sedap sekali! 🔥🎉🚀"
	expected := "Makan nasi padang sedap sekali!"
	got := ai.StripEmojis(input)
	if got != expected {
		t.Errorf("expected %q, got %q", expected, got)
	}
}

func TestParseTransactionDraft(t *testing.T) {
	accounts := []domain.Account{
		{ID: "acc-bank", Name: "BCA", Type: domain.AccountTypeBank},
		{ID: "acc-cash", Name: "Dompet Tunai", Type: domain.AccountTypeCash},
	}
	categories := []domain.Category{
		{ID: "cat-food", Name: "Makanan & Minuman", Type: domain.TransactionTypeExpense},
		{ID: "cat-trans", Name: "Transportasi", Type: domain.TransactionTypeExpense},
		{ID: "cat-salary", Name: "Gaji Bulanan", Type: domain.TransactionTypeIncome},
	}
	now := time.Date(2026, 11, 12, 12, 0, 0, 0, ai.WIB)

	t.Run("valid complete json", func(t *testing.T) {
		jsonStr := `{
			"amount": 25000,
			"type": "EXPENSE",
			"category_id": "cat-food",
			"account_id": "acc-bank",
			"description": "Makan siang padang",
			"transaction_date": "2026-11-12"
		}`

		draft, err := ai.ParseTransactionDraft(jsonStr, accounts, categories, "makan siang 25rb", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if draft.Amount != 25000 {
			t.Errorf("expected amount 25000, got %d", draft.Amount)
		}
		if draft.Type != domain.TransactionTypeExpense {
			t.Errorf("expected type EXPENSE, got %s", draft.Type)
		}
		if draft.CategoryID != "cat-food" {
			t.Errorf("expected category_id cat-food, got %s", draft.CategoryID)
		}
		if draft.AccountID != "acc-bank" {
			t.Errorf("expected account_id acc-bank, got %s", draft.AccountID)
		}
		if draft.Description != "Makan siang padang" {
			t.Errorf("expected description 'Makan siang padang', got %s", draft.Description)
		}
		if draft.TransactionDate != "2026-11-12" {
			t.Errorf("expected date 2026-11-12, got %s", draft.TransactionDate)
		}
	})

	t.Run("markdown fenced json", func(t *testing.T) {
		jsonStr := "```json\n" + `{"amount": 50000, "type": "EXPENSE", "category_id": "cat-food", "account_id": "acc-cash", "description": "Beli kopi", "transaction_date": "2026-11-12"}` + "\n```"

		draft, err := ai.ParseTransactionDraft(jsonStr, accounts, categories, "beli kopi 50rb", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if draft.Amount != 50000 {
			t.Errorf("expected amount 50000, got %d", draft.Amount)
		}
	})

	t.Run("fallback unknown account and category", func(t *testing.T) {
		jsonStr := `{
			"amount": "15.000",
			"type": "EXPENSE",
			"category_id": "non-existent-cat",
			"account_id": "non-existent-acc",
			"description": "Bakso 🍜",
			"transaction_date": ""
		}`

		draft, err := ai.ParseTransactionDraft(jsonStr, accounts, categories, "bakso 15rb", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if draft.Amount != 15000 {
			t.Errorf("expected amount 15000, got %d", draft.Amount)
		}
		// Fallback account should pick CASH account (acc-cash)
		if draft.AccountID != "acc-cash" {
			t.Errorf("expected fallback to cash account 'acc-cash', got %s", draft.AccountID)
		}
		// Fallback category should pick first matching expense category (cat-food)
		if draft.CategoryID != "cat-food" {
			t.Errorf("expected fallback to first expense category 'cat-food', got %s", draft.CategoryID)
		}
		// Emoji stripped
		if draft.Description != "Bakso" {
			t.Errorf("expected emoji stripped 'Bakso', got %s", draft.Description)
		}
		// Date fallback to today
		if draft.TransactionDate != "2026-11-12" {
			t.Errorf("expected date fallback '2026-11-12', got %s", draft.TransactionDate)
		}
	})

	t.Run("income transaction resolves income category", func(t *testing.T) {
		jsonStr := `{
			"amount": 5000000,
			"type": "INCOME",
			"category_id": "",
			"account_id": "acc-bank",
			"description": "Gaji kantor",
			"transaction_date": "2026-11-01"
		}`

		draft, err := ai.ParseTransactionDraft(jsonStr, accounts, categories, "gaji 5jt", now)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if draft.Type != domain.TransactionTypeIncome {
			t.Errorf("expected type INCOME, got %s", draft.Type)
		}
		if draft.CategoryID != "cat-salary" {
			t.Errorf("expected income category 'cat-salary', got %s", draft.CategoryID)
		}
	})

	t.Run("invalid amount <= 0 returns ErrInvalidAmount", func(t *testing.T) {
		jsonStr := `{
			"amount": 0,
			"type": "EXPENSE",
			"category_id": "cat-food",
			"account_id": "acc-cash",
			"description": "Gratis",
			"transaction_date": "2026-11-12"
		}`

		_, err := ai.ParseTransactionDraft(jsonStr, accounts, categories, "gratis", now)
		if !errors.Is(err, domain.ErrInvalidAmount) {
			t.Errorf("expected ErrInvalidAmount, got: %v", err)
		}
	})

	t.Run("invalid json returns error", func(t *testing.T) {
		_, err := ai.ParseTransactionDraft("not a json string", accounts, categories, "test", now)
		if err == nil {
			t.Error("expected error for malformed json, got nil")
		}
	})

	t.Run("empty accounts returns ErrAccountNotFound", func(t *testing.T) {
		jsonStr := `{"amount": 10000, "type": "EXPENSE", "category_id": "cat-food", "account_id": "acc-cash"}`
		_, err := ai.ParseTransactionDraft(jsonStr, nil, categories, "test", now)
		if !errors.Is(err, domain.ErrAccountNotFound) {
			t.Errorf("expected ErrAccountNotFound, got: %v", err)
		}
	})

	t.Run("empty categories returns ErrCategoryNotFound", func(t *testing.T) {
		jsonStr := `{"amount": 10000, "type": "EXPENSE", "category_id": "cat-food", "account_id": "acc-cash"}`
		_, err := ai.ParseTransactionDraft(jsonStr, accounts, nil, "test", now)
		if !errors.Is(err, domain.ErrCategoryNotFound) {
			t.Errorf("expected ErrCategoryNotFound, got: %v", err)
		}
	})
}

package ai

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"finara/server/internal/domain"
)

var WIB = time.FixedZone("WIB", 7*3600)

// FormatSystemPrompt builds context-aware instructions for OpenAI-compatible models.
func FormatSystemPrompt(accounts []domain.Account, categories []domain.Category, now time.Time) string {
	todayStr := now.In(WIB).Format("2006-01-02")

	var accountsBuilder strings.Builder
	for _, acc := range accounts {
		accountsBuilder.WriteString(fmt.Sprintf("- id: %s, name: %q, type: %s\n", acc.ID, acc.Name, acc.Type))
	}

	var categoriesBuilder strings.Builder
	for _, cat := range categories {
		categoriesBuilder.WriteString(fmt.Sprintf("- id: %s, name: %q, type: %s\n", cat.ID, cat.Name, cat.Type))
	}

	return fmt.Sprintf(`You are Finara's financial transaction parsing engine.
Your task is to parse natural language Indonesian transaction text into a structured JSON draft.
Today's date in Jakarta (WIB): %s.

Available User Accounts:
%s
Available User Categories:
%s
Output STRICTLY a JSON object without markdown fences, with these exact keys:
{
  "amount": <positive integer in Indonesian Rupiah>,
  "type": "EXPENSE" or "INCOME",
  "category_id": "<matching category id>",
  "account_id": "<matching account id or default cash account>",
  "description": "<concise description without emojis or emoticons>",
  "transaction_date": "<YYYY-MM-DD>"
}

Rules:
1. Parse amount accurately into exact IDR integer (e.g. "25rb" = 25000, "1.5jt" = 1500000, "10k" = 10000). Amount must be > 0.
2. If type is not explicitly income (e.g. "gaji", "terima uang", "bonus"), default to "EXPENSE".
3. Pick the closest matching category_id from the list.
4. Pick the closest matching account_id if mentioned (e.g. "bca", "gopay", "tunai"), or use the default cash account.
5. If relative dates are mentioned (e.g. "kemarin", "lusa", "tadi"), compute date relative to today (%s).
6. Anti-slop: NEVER include emojis, emoticons, or special decorative symbols in description.`,
		todayStr,
		accountsBuilder.String(),
		categoriesBuilder.String(),
		todayStr,
	)
}

// StripEmojis removes all emojis, pictographs, and emoticons from text.
func StripEmojis(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 0x1F600 && r <= 0x1F64F) || // Emoticons
			(r >= 0x1F300 && r <= 0x1F5FF) || // Misc Symbols and Pictographs
			(r >= 0x1F680 && r <= 0x1F6FF) || // Transport and Map
			(r >= 0x1F700 && r <= 0x1F77F) || // Alchemical Symbols
			(r >= 0x1F780 && r <= 0x1F7FF) || // Geometric Shapes Extended
			(r >= 0x1F800 && r <= 0x1F8FF) || // Supplemental Arrows-C
			(r >= 0x1F900 && r <= 0x1F9FF) || // Supplemental Symbols and Pictographs
			(r >= 0x1FA00 && r <= 0x1FA6F) || // Chess Symbols
			(r >= 0x1FA70 && r <= 0x1FAFF) || // Symbols and Pictographs Extended-A
			(r >= 0x2600 && r <= 0x26FF) || // Misc symbols
			(r >= 0x2700 && r <= 0x27BF) || // Dingbats
			(r >= 0xFE00 && r <= 0xFE0F) || // Variation Selectors
			(r >= 0x1F1E6 && r <= 0x1F1FF) || // Flags
			r == 0x200D { // Zero-width joiner
			continue
		}
		b.WriteRune(r)
	}
	return strings.Join(strings.Fields(b.String()), " ")
}

type intermediateDraft struct {
	Amount          any    `json:"amount"`
	Type            string `json:"type"`
	CategoryID      string `json:"category_id"`
	AccountID       string `json:"account_id"`
	Description     string `json:"description"`
	TransactionDate string `json:"transaction_date"`
}

// ParseTransactionDraft parses the LLM output into a validated domain draft.
func ParseTransactionDraft(
	rawContent string,
	accounts []domain.Account,
	categories []domain.Category,
	fallbackPrompt string,
	now time.Time,
) (*domain.ParsedTransactionDraft, error) {
	cleaned := strings.TrimSpace(rawContent)
	if strings.HasPrefix(cleaned, "```") {
		if idx := strings.Index(cleaned, "\n"); idx != -1 {
			cleaned = cleaned[idx+1:]
		}
		if idx := strings.LastIndex(cleaned, "```"); idx != -1 {
			cleaned = cleaned[:idx]
		}
		cleaned = strings.TrimSpace(cleaned)
	}

	var raw intermediateDraft
	if err := json.Unmarshal([]byte(cleaned), &raw); err != nil {
		return nil, fmt.Errorf("invalid json draft: %w", err)
	}

	amount, err := parseAmount(raw.Amount)
	if err != nil || amount <= 0 {
		return nil, domain.ErrInvalidAmount
	}

	txType := domain.TransactionTypeExpense
	if strings.EqualFold(strings.TrimSpace(raw.Type), string(domain.TransactionTypeIncome)) {
		txType = domain.TransactionTypeIncome
	}

	accountID := resolveAccountID(raw.AccountID, accounts)
	if accountID == "" {
		return nil, domain.ErrAccountNotFound
	}

	categoryID := resolveCategoryID(raw.CategoryID, txType, categories)
	if categoryID == "" {
		return nil, domain.ErrCategoryNotFound
	}

	txDate := resolveTransactionDate(raw.TransactionDate, now)

	desc := StripEmojis(raw.Description)
	if desc == "" {
		desc = StripEmojis(fallbackPrompt)
	}
	if desc == "" {
		for _, cat := range categories {
			if cat.ID == categoryID {
				desc = cat.Name
				break
			}
		}
	}
	if desc == "" {
		desc = "Transaksi"
	}

	return &domain.ParsedTransactionDraft{
		Amount:          amount,
		Type:            txType,
		CategoryID:      categoryID,
		AccountID:       accountID,
		Description:     desc,
		TransactionDate: txDate,
	}, nil
}

func parseAmount(v any) (int64, error) {
	switch val := v.(type) {
	case float64:
		return int64(val), nil
	case int64:
		return val, nil
	case int:
		return int64(val), nil
	case string:
		clean := strings.TrimSpace(strings.ToLower(val))
		clean = strings.ReplaceAll(clean, "rp", "")
		clean = strings.ReplaceAll(clean, "idr", "")
		clean = strings.ReplaceAll(clean, " ", "")
		clean = strings.ReplaceAll(clean, ".", "")
		clean = strings.ReplaceAll(clean, ",", "")
		return strconv.ParseInt(clean, 10, 64)
	default:
		return 0, domain.ErrInvalidAmount
	}
}

func resolveAccountID(suggestedID string, accounts []domain.Account) string {
	if len(accounts) == 0 {
		return ""
	}

	suggestedID = strings.TrimSpace(suggestedID)
	if suggestedID != "" {
		for _, acc := range accounts {
			if acc.ID == suggestedID {
				return acc.ID
			}
		}
	}

	// Fallback to cash account or name containing cash/tunai
	for _, acc := range accounts {
		if acc.Type == domain.AccountTypeCash {
			return acc.ID
		}
	}
	for _, acc := range accounts {
		name := strings.ToLower(acc.Name)
		if strings.Contains(name, "tunai") || strings.Contains(name, "cash") {
			return acc.ID
		}
	}

	return accounts[0].ID
}

func resolveCategoryID(suggestedID string, txType domain.TransactionType, categories []domain.Category) string {
	if len(categories) == 0 {
		return ""
	}

	suggestedID = strings.TrimSpace(suggestedID)
	if suggestedID != "" {
		for _, cat := range categories {
			if cat.ID == suggestedID && cat.Type == txType {
				return cat.ID
			}
		}
		for _, cat := range categories {
			if cat.ID == suggestedID {
				return cat.ID
			}
		}
	}

	// Fallback to first category of matching type
	for _, cat := range categories {
		if cat.Type == txType {
			return cat.ID
		}
	}

	return categories[0].ID
}

func resolveTransactionDate(suggestedDate string, now time.Time) string {
	suggestedDate = strings.TrimSpace(suggestedDate)
	if _, err := time.Parse("2006-01-02", suggestedDate); err == nil {
		return suggestedDate
	}
	return now.In(WIB).Format("2006-01-02")
}

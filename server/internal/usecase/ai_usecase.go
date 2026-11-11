package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"finara/server/internal/ai"
	"finara/server/internal/domain"
)

const (
	AIRateLimitMax           = 20
	AIRateLimitWindowSeconds = 60 * time.Second
)

type AIUsecase interface {
	ParseTransaction(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error)
}

type aiUsecase struct {
	rateLimitRepo domain.AIRateLimitRepository
	accountRepo   domain.AccountRepository
	categoryRepo  domain.CategoryRepository
	chatClient    ai.ChatClient
	timeNow       func() time.Time
}

func NewAIUsecase(
	rateLimitRepo domain.AIRateLimitRepository,
	accountRepo domain.AccountRepository,
	categoryRepo domain.CategoryRepository,
	chatClient ai.ChatClient,
) AIUsecase {
	return &aiUsecase{
		rateLimitRepo: rateLimitRepo,
		accountRepo:   accountRepo,
		categoryRepo:  categoryRepo,
		chatClient:    chatClient,
		timeNow:       time.Now,
	}
}

func (u *aiUsecase) ParseTransaction(ctx context.Context, userID, prompt string) (*domain.ParsedTransactionDraft, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(prompt) == "" {
		return nil, domain.ErrInvalidInput
	}

	allowed, err := u.rateLimitRepo.Allow(ctx, userID, AIRateLimitMax, AIRateLimitWindowSeconds)
	if err != nil {
		return nil, fmt.Errorf("rate limit check: %w", err)
	}
	if !allowed {
		return nil, domain.ErrRateLimitExceeded
	}

	accounts, err := u.accountRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch accounts: %w", err)
	}

	categories, err := u.categoryRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch categories: %w", err)
	}

	now := u.timeNow()
	systemPrompt := ai.FormatSystemPrompt(accounts, categories, now)

	rawResponse, err := u.chatClient.CompleteChat(ctx, systemPrompt, prompt)
	if err != nil {
		return nil, domain.ErrAIServiceUnavailable
	}

	draft, err := ai.ParseTransactionDraft(rawResponse, accounts, categories, prompt, now)
	if err != nil {
		return nil, domain.ErrAIServiceUnavailable
	}

	return draft, nil
}

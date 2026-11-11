package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/mail"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"

	"finara/server/internal/domain"
)

var defaultExpenseCategories = []string{
	"Makanan & Minuman",
	"Transportasi",
	"Belanja",
	"Tagihan",
	"Hiburan",
	"Lainnya",
}

var defaultIncomeCategories = []string{
	"Gaji",
	"Bonus",
	"Investasi",
	"Lainnya",
}

type RegisterInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResult struct {
	Token string       `json:"token"`
	User  *domain.User `json:"user"`
}

type AuthUsecase interface {
	Register(ctx context.Context, input RegisterInput) (*AuthResult, error)
	Login(ctx context.Context, input LoginInput) (*AuthResult, error)
	GetMe(ctx context.Context, userID string) (*domain.User, error)
	Logout(ctx context.Context, token string) error
	ValidateToken(ctx context.Context, token string) (*domain.User, error)
}

type authUsecase struct {
	userRepo domain.UserRepository
}

func NewAuthUsecase(userRepo domain.UserRepository) AuthUsecase {
	return &authUsecase{
		userRepo: userRepo,
	}
}

func (u *authUsecase) Register(ctx context.Context, input RegisterInput) (*AuthResult, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, domain.ErrInvalidInput
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	if !isValidEmail(email) {
		return nil, domain.ErrInvalidInput
	}

	if len(input.Password) < 8 {
		return nil, domain.ErrInvalidInput
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return nil, err
	}

	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user := &domain.User{
		Email:        email,
		PasswordHash: string(hash),
		Name:         name,
	}

	session := &domain.Session{
		Token:     token,
		ExpiresAt: now.Add(30 * 24 * time.Hour),
	}

	defaultAccount := &domain.Account{
		Name:             "Tunai",
		Type:             domain.AccountTypeCash,
		OpeningBalance:   0,
		OpeningBalanceAt: now,
	}

	categories := make([]domain.Category, 0, len(defaultExpenseCategories)+len(defaultIncomeCategories))
	for _, catName := range defaultExpenseCategories {
		categories = append(categories, domain.Category{
			Name: catName,
			Type: domain.TransactionTypeExpense,
		})
	}
	for _, catName := range defaultIncomeCategories {
		categories = append(categories, domain.Category{
			Name: catName,
			Type: domain.TransactionTypeIncome,
		})
	}

	if err := u.userRepo.RegisterAtomic(ctx, user, session, defaultAccount, categories); err != nil {
		return nil, err
	}

	user.PasswordHash = ""

	return &AuthResult{
		Token: token,
		User:  user,
	}, nil
}

func (u *authUsecase) Login(ctx context.Context, input LoginInput) (*AuthResult, error) {
	email := strings.TrimSpace(strings.ToLower(input.Email))
	if email == "" || input.Password == "" {
		return nil, domain.ErrUnauthorized
	}

	user, err := u.userRepo.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return nil, domain.ErrUnauthorized
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, domain.ErrUnauthorized
	}

	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	session := &domain.Session{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	if err := u.userRepo.CreateSession(ctx, session); err != nil {
		return nil, err
	}

	user.PasswordHash = ""

	return &AuthResult{
		Token: token,
		User:  user,
	}, nil
}

func (u *authUsecase) GetMe(ctx context.Context, userID string) (*domain.User, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, domain.ErrUnauthorized
	}
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user.PasswordHash = ""
	return user, nil
}

func (u *authUsecase) Logout(ctx context.Context, token string) error {
	if strings.TrimSpace(token) == "" {
		return nil
	}
	return u.userRepo.DeleteSession(ctx, token)
}

func (u *authUsecase) ValidateToken(ctx context.Context, token string) (*domain.User, error) {
	if strings.TrimSpace(token) == "" {
		return nil, domain.ErrUnauthorized
	}

	session, err := u.userRepo.GetSessionByToken(ctx, token)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	if session == nil || time.Now().After(session.ExpiresAt) {
		return nil, domain.ErrUnauthorized
	}

	user, err := u.userRepo.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, domain.ErrUnauthorized
	}

	user.PasswordHash = ""
	return user, nil
}

func isValidEmail(email string) bool {
	if len(email) < 3 || len(email) > 254 {
		return false
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return false
	}
	domainPart := parts[1]
	if !strings.Contains(domainPart, ".") || strings.HasPrefix(domainPart, ".") || strings.HasSuffix(domainPart, ".") {
		return false
	}
	return true
}

func generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

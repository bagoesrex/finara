package domain

import "errors"

var (
	ErrNotFound             = errors.New("not found")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrDuplicateRequest     = errors.New("duplicate request")
	ErrInvalidAmount        = errors.New("invalid amount")
	ErrInvalidInput         = errors.New("invalid input")
	ErrAccountNotFound      = errors.New("account not found")
	ErrCategoryNotFound     = errors.New("category not found")
	ErrConflict             = errors.New("conflict")
	ErrRateLimitExceeded    = errors.New("rate limit exceeded")
	ErrAIServiceUnavailable = errors.New("Gagal memproses draf, silakan coba lagi atau input manual")
)

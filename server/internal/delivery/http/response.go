package http

import (
	"errors"
	nethttp "net/http"

	"github.com/labstack/echo/v4"
	"finara/server/internal/domain"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

func RespondJSON(c echo.Context, status int, data any) error {
	return c.JSON(status, data)
}

func RespondError(c echo.Context, err error) error {
	switch {
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrInvalidAmount):
		return c.JSON(nethttp.StatusBadRequest, ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrUnauthorized):
		return c.JSON(nethttp.StatusUnauthorized, ErrorResponse{Error: "unauthorized"})
	case errors.Is(err, domain.ErrNotFound), errors.Is(err, domain.ErrAccountNotFound), errors.Is(err, domain.ErrCategoryNotFound):
		return c.JSON(nethttp.StatusNotFound, ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrConflict), errors.Is(err, domain.ErrDuplicateRequest):
		return c.JSON(nethttp.StatusConflict, ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrRateLimitExceeded):
		return c.JSON(nethttp.StatusTooManyRequests, ErrorResponse{Error: err.Error()})
	case errors.Is(err, domain.ErrAIServiceUnavailable):
		return c.JSON(nethttp.StatusServiceUnavailable, ErrorResponse{Error: err.Error()})
	default:
		return c.JSON(nethttp.StatusInternalServerError, ErrorResponse{Error: "internal server error"})
	}
}

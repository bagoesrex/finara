package http

import (
	nethttp "net/http"

	"github.com/labstack/echo/v4"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type FinanceHandler struct {
	usecase usecase.FinanceUsecase
}

func NewFinanceHandler(u usecase.FinanceUsecase) *FinanceHandler {
	return &FinanceHandler{
		usecase: u,
	}
}

func (h *FinanceHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.GET("/accounts", h.ListAccounts, authMiddleware)
	g.GET("/categories", h.ListCategories, authMiddleware)
	g.GET("/finance/snapshot", h.GetSnapshot, authMiddleware)
}

func (h *FinanceHandler) ListAccounts(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	accounts, err := h.usecase.ListAccounts(c.Request().Context(), userID)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, accounts)
}

func (h *FinanceHandler) ListCategories(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	categories, err := h.usecase.ListCategories(c.Request().Context(), userID)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, categories)
}

func (h *FinanceHandler) GetSnapshot(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	snapshot, err := h.usecase.GetSnapshot(c.Request().Context(), userID)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, snapshot)
}

package http

import (
	nethttp "net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type UpsertBudgetRequest struct {
	CategoryID string `json:"category_id"`
	Month      string `json:"month"`
	Amount     int64  `json:"amount"`
}

type BudgetHandler struct {
	usecase usecase.BudgetUsecase
}

func NewBudgetHandler(u usecase.BudgetUsecase) *BudgetHandler {
	return &BudgetHandler{
		usecase: u,
	}
}

func (h *BudgetHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	budgetGroup := g.Group("/budgets", authMiddleware)
	budgetGroup.GET("", h.List)
	budgetGroup.POST("", h.Upsert)
}

func parseMonthString(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if val == "" {
		now := time.Now().UTC()
		return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}

	if t, err := time.Parse("2006-01", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}

	if t, err := time.Parse("2006-01-02", val); err == nil {
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}

	return time.Time{}, domain.ErrInvalidInput
}

func (h *BudgetHandler) List(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	monthStr := c.QueryParam("month")
	parsedMonth, err := parseMonthString(monthStr)
	if err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	budgets, err := h.usecase.ListByMonth(c.Request().Context(), userID, parsedMonth)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, budgets)
}

func (h *BudgetHandler) Upsert(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	var req UpsertBudgetRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	parsedMonth, err := parseMonthString(req.Month)
	if err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	if req.Amount <= 0 {
		return RespondError(c, domain.ErrInvalidAmount)
	}

	budget := &domain.Budget{
		UserID:      userID,
		CategoryID:  req.CategoryID,
		PeriodStart: parsedMonth,
		Amount:      req.Amount,
	}

	saved, err := h.usecase.Upsert(c.Request().Context(), budget)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, saved)
}

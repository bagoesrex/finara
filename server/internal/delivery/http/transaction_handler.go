package http

import (
	nethttp "net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type CreateTransactionRequest struct {
	AccountID       string                 `json:"account_id"`
	CategoryID      string                 `json:"category_id"`
	Type            domain.TransactionType `json:"type"`
	Amount          int64                  `json:"amount"`
	Description     string                 `json:"description"`
	TransactionDate string                 `json:"transaction_date"`
	TransactionTime *string                `json:"transaction_time,omitempty"`
	ClientRequestID string                 `json:"client_request_id"`
}

type UpdateTransactionRequest struct {
	AccountID       *string                 `json:"account_id"`
	CategoryID      *string                 `json:"category_id"`
	Type            *domain.TransactionType `json:"type"`
	Amount          *int64                  `json:"amount"`
	Description     *string                 `json:"description"`
	TransactionDate *string                 `json:"transaction_date"`
	TransactionTime *string                 `json:"transaction_time"`
}

type TransactionHandler struct {
	usecase usecase.TransactionUsecase
}

func NewTransactionHandler(u usecase.TransactionUsecase) *TransactionHandler {
	return &TransactionHandler{
		usecase: u,
	}
}

func (h *TransactionHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	txGroup := g.Group("/transactions", authMiddleware)
	txGroup.GET("", h.List)
	txGroup.POST("", h.Create)
	txGroup.GET("/:id", h.GetByID)
	txGroup.PATCH("/:id", h.Update)
	txGroup.DELETE("/:id", h.Delete)
}

func parseFlexibleDate(val string) (time.Time, error) {
	val = strings.TrimSpace(val)
	if t, err := time.Parse("2006-01-02", val); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, val)
}

func (h *TransactionHandler) List(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	filter := domain.TransactionFilter{
		UserID: userID,
		Search: c.QueryParam("search"),
		Cursor: c.QueryParam("cursor"),
	}

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filter.Limit = limit
		}
	}

	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = offset
		}
	}

	if accID := c.QueryParam("account_id"); accID != "" {
		filter.AccountID = &accID
	}

	if catID := c.QueryParam("category_id"); catID != "" {
		filter.CategoryID = &catID
	}

	if typeStr := c.QueryParam("type"); typeStr != "" {
		t := domain.TransactionType(typeStr)
		filter.Type = &t
	}

	if startStr := c.QueryParam("start_date"); startStr != "" {
		if startDate, err := parseFlexibleDate(startStr); err == nil {
			filter.StartDate = &startDate
		} else {
			return RespondError(c, domain.ErrInvalidInput)
		}
	}

	if endStr := c.QueryParam("end_date"); endStr != "" {
		if endDate, err := parseFlexibleDate(endStr); err == nil {
			filter.EndDate = &endDate
		} else {
			return RespondError(c, domain.ErrInvalidInput)
		}
	}

	transactions, err := h.usecase.List(c.Request().Context(), filter)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, transactions)
}

func (h *TransactionHandler) Create(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	var req CreateTransactionRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	if req.TransactionDate == "" {
		return RespondError(c, domain.ErrInvalidInput)
	}
	txDate, err := parseFlexibleDate(req.TransactionDate)
	if err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	tx := &domain.Transaction{
		UserID:          userID,
		AccountID:       req.AccountID,
		CategoryID:      req.CategoryID,
		Type:            req.Type,
		Amount:          req.Amount,
		Description:     req.Description,
		TransactionDate: txDate,
		TransactionTime: req.TransactionTime,
		ClientRequestID: req.ClientRequestID,
	}

	created, err := h.usecase.Create(c.Request().Context(), tx)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusCreated, created)
}

func (h *TransactionHandler) GetByID(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	id := c.Param("id")
	tx, err := h.usecase.GetByID(c.Request().Context(), userID, id)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, tx)
}

func (h *TransactionHandler) Update(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	id := c.Param("id")
	var req UpdateTransactionRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	var parsedDate *time.Time
	if req.TransactionDate != nil {
		d, err := parseFlexibleDate(*req.TransactionDate)
		if err != nil {
			return RespondError(c, domain.ErrInvalidInput)
		}
		parsedDate = &d
	}

	input := usecase.UpdateTransactionInput{
		AccountID:       req.AccountID,
		CategoryID:      req.CategoryID,
		Type:            req.Type,
		Amount:          req.Amount,
		Description:     req.Description,
		TransactionDate: parsedDate,
		TransactionTime: req.TransactionTime,
	}

	updated, err := h.usecase.Update(c.Request().Context(), userID, id, input)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, updated)
}

func (h *TransactionHandler) Delete(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	id := c.Param("id")
	if err := h.usecase.Delete(c.Request().Context(), userID, id); err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, map[string]string{
		"message": "transaction deleted",
	})
}

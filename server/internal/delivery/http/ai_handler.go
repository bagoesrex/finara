package http

import (
	nethttp "net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type ParseTransactionRequest struct {
	Prompt string `json:"prompt"`
}

type ParseTransactionResponse struct {
	Draft *domain.ParsedTransactionDraft `json:"draft"`
}

type AIHandler struct {
	usecase usecase.AIUsecase
}

func NewAIHandler(u usecase.AIUsecase) *AIHandler {
	return &AIHandler{
		usecase: u,
	}
}

func (h *AIHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	aiGroup := g.Group("/ai", authMiddleware)
	aiGroup.POST("/parse-transaction", h.ParseTransaction)
}

func (h *AIHandler) ParseTransaction(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	var req ParseTransactionRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	if strings.TrimSpace(req.Prompt) == "" {
		return RespondError(c, domain.ErrInvalidInput)
	}

	draft, err := h.usecase.ParseTransaction(c.Request().Context(), userID, req.Prompt)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, ParseTransactionResponse{
		Draft: draft,
	})
}

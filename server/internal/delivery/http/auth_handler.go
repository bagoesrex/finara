package http

import (
	nethttp "net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type UserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type MeResponse struct {
	User UserResponse `json:"user"`
}

type LogoutResponse struct {
	Message string `json:"message"`
}

type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthHandler struct {
	usecase usecase.AuthUsecase
}

func NewAuthHandler(u usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{
		usecase: u,
	}
}

func (h *AuthHandler) RegisterRoutes(g *echo.Group, authMiddleware echo.MiddlewareFunc) {
	g.POST("/register", h.Register)
	g.POST("/login", h.Login)
	g.GET("/me", h.Me, authMiddleware)
	g.POST("/logout", h.Logout, authMiddleware)
}

func (h *AuthHandler) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	res, err := h.usecase.Register(c.Request().Context(), usecase.RegisterInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusCreated, AuthResponse{
		Token: res.Token,
		User: UserResponse{
			ID:    res.User.ID,
			Name:  res.User.Name,
			Email: res.User.Email,
		},
	})
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return RespondError(c, domain.ErrInvalidInput)
	}

	res, err := h.usecase.Login(c.Request().Context(), usecase.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, AuthResponse{
		Token: res.Token,
		User: UserResponse{
			ID:    res.User.ID,
			Name:  res.User.Name,
			Email: res.User.Email,
		},
	})
}

func (h *AuthHandler) Me(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok || userID == "" {
		return RespondError(c, domain.ErrUnauthorized)
	}

	user, err := h.usecase.GetMe(c.Request().Context(), userID)
	if err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, MeResponse{
		User: UserResponse{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
		},
	})
}

func (h *AuthHandler) Logout(c echo.Context) error {
	token, ok := c.Get("token").(string)
	if !ok || token == "" {
		authHeader := c.Request().Header.Get("Authorization")
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 {
			token = strings.TrimSpace(parts[1])
		}
	}

	if err := h.usecase.Logout(c.Request().Context(), token); err != nil {
		return RespondError(c, err)
	}

	return RespondJSON(c, nethttp.StatusOK, LogoutResponse{
		Message: "logged out",
	})
}

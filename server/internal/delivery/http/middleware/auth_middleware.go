package middleware

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"finara/server/internal/usecase"
)

func Auth(authUsecase usecase.AuthUsecase) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			token := strings.TrimSpace(parts[1])
			user, err := authUsecase.ValidateToken(c.Request().Context(), token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			}

			c.Set("user_id", user.ID)
			c.Set("user", user)
			c.Set("token", token)

			return next(c)
		}
	}
}

func NewAuthMiddleware(authUsecase usecase.AuthUsecase) echo.MiddlewareFunc {
	return Auth(authUsecase)
}

package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	_ "github.com/jackc/pgx/v5"

	"finara/server/internal/ai"
	httpDelivery "finara/server/internal/delivery/http"
	authmw "finara/server/internal/delivery/http/middleware"
	"finara/server/internal/repository/postgres"
	"finara/server/internal/usecase"
	"finara/server/migrations"
)

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	corsAllowOrigins := os.Getenv("CORS_ALLOW_ORIGINS")
	if corsAllowOrigins == "" {
		corsAllowOrigins = "http://localhost:5173"
	}
	origins := strings.Split(corsAllowOrigins, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: origins,
		AllowHeaders: []string{echo.HeaderAuthorization, echo.HeaderContentType},
		AllowMethods: []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
	}))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ok",
		})
	})

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL != "" {
		pool, err := postgres.NewDBPool(context.Background(), databaseURL)
		if err != nil {
			e.Logger.Fatalf("failed to connect to database: %v", err)
		}
		defer pool.Close()

		if err := migrations.MigrateUp(context.Background(), pool); err != nil {
			e.Logger.Fatalf("failed to run database migrations: %v", err)
		}

		userRepo := postgres.NewUserRepository(pool)
		accountRepo := postgres.NewAccountRepository(pool)
		categoryRepo := postgres.NewCategoryRepository(pool)
		txRepo := postgres.NewTransactionRepository(pool)
		budgetRepo := postgres.NewBudgetRepository(pool)

		authUsecase := usecase.NewAuthUsecase(userRepo)
		authMiddleware := authmw.NewAuthMiddleware(authUsecase)
		authHandler := httpDelivery.NewAuthHandler(authUsecase)

		txUsecase := usecase.NewTransactionUsecase(txRepo, accountRepo, categoryRepo)
		txHandler := httpDelivery.NewTransactionHandler(txUsecase)

		budgetUsecase := usecase.NewBudgetUsecase(budgetRepo, categoryRepo)
		budgetHandler := httpDelivery.NewBudgetHandler(budgetUsecase)

		financeUsecase := usecase.NewFinanceUsecase(accountRepo, categoryRepo, txRepo)
		financeHandler := httpDelivery.NewFinanceHandler(financeUsecase)

		aiRateLimitRepo := postgres.NewAIRateLimitRepository(pool)
		aiTimeout := 8
		if timeoutStr := os.Getenv("AI_TIMEOUT_SECONDS"); timeoutStr != "" {
			if t, err := strconv.Atoi(timeoutStr); err == nil && t > 0 {
				aiTimeout = t
			}
		}

		aiClient := ai.NewClient(ai.ClientConfig{
			BaseURL:        os.Getenv("AI_BASE_URL"),
			APIKey:         os.Getenv("AI_API_KEY"),
			Model:          os.Getenv("AI_MODEL"),
			TimeoutSeconds: aiTimeout,
		})

		aiUsecase := usecase.NewAIUsecase(aiRateLimitRepo, accountRepo, categoryRepo, aiClient)
		aiHandler := httpDelivery.NewAIHandler(aiUsecase)

		apiGroup := e.Group("/api")
		authGroup := apiGroup.Group("/auth")
		authHandler.RegisterRoutes(authGroup, authMiddleware)

		txHandler.RegisterRoutes(apiGroup, authMiddleware)
		budgetHandler.RegisterRoutes(apiGroup, authMiddleware)
		financeHandler.RegisterRoutes(apiGroup, authMiddleware)
		aiHandler.RegisterRoutes(apiGroup, authMiddleware)
	} else {
		e.Logger.Warn("DATABASE_URL not set; skipping auth route initialization")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		addr := fmt.Sprintf(":%s", port)
		if err := e.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
			e.Logger.Fatal("shutting down the server: ", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(shutdownCtx); err != nil {
		e.Logger.Fatal("server forced to shutdown: ", err)
	}
}

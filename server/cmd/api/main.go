package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	_ "github.com/jackc/pgx/v5"

	httpDelivery "finara/server/internal/delivery/http"
	authmw "finara/server/internal/delivery/http/middleware"
	"finara/server/internal/repository/postgres"
	"finara/server/internal/usecase"
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

		apiGroup := e.Group("/api")
		authGroup := apiGroup.Group("/auth")
		authHandler.RegisterRoutes(authGroup, authMiddleware)

		txHandler.RegisterRoutes(apiGroup, authMiddleware)
		budgetHandler.RegisterRoutes(apiGroup, authMiddleware)
		financeHandler.RegisterRoutes(apiGroup, authMiddleware)
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

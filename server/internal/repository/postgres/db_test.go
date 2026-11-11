package postgres

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func findMigrationsDir(t *testing.T) string {
	candidates := []string{
		filepath.Join("..", "..", "..", "migrations"),
		filepath.Join("..", "..", "migrations"),
		filepath.Join("migrations"),
		filepath.Join("server", "migrations"),
	}
	for _, candidate := range candidates {
		if fi, err := os.Stat(candidate); err == nil && fi.IsDir() {
			return candidate
		}
	}
	t.Fatalf("migrations directory not found in candidate paths")
	return ""
}

func TestMigrationFilesContent(t *testing.T) {
	migrationsDir := findMigrationsDir(t)

	upSQLBytes, err := os.ReadFile(filepath.Join(migrationsDir, "000001_init_schema.up.sql"))
	if err != nil {
		t.Fatalf("failed to read up migration file: %v", err)
	}
	upSQL := string(upSQLBytes)

	requiredUpStatements := []string{
		"CREATE TABLE users",
		"CREATE TABLE auth_sessions",
		"CREATE TYPE account_type AS ENUM",
		"CREATE TABLE accounts",
		"CREATE TYPE transaction_type AS ENUM",
		"CREATE TABLE categories",
		"CREATE TABLE transactions",
		"CREATE TABLE budgets",
		"CREATE TABLE ai_rate_limits",
		"CONSTRAINT uq_account_user UNIQUE (id, user_id)",
		"CONSTRAINT uq_category_user_type UNIQUE (id, user_id, type)",
		"CONSTRAINT fk_tx_account FOREIGN KEY",
		"CONSTRAINT fk_tx_category FOREIGN KEY",
		"CONSTRAINT uq_tx_client_request UNIQUE (user_id, client_request_id)",
		"CONSTRAINT fk_budget_category FOREIGN KEY",
		"CONSTRAINT uq_budget_user_cat_period UNIQUE (user_id, category_id, period_start)",
		"CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);",
		"CREATE INDEX idx_accounts_user_id ON accounts(user_id);",
		"CREATE INDEX idx_categories_user_type ON categories(user_id, type);",
		"CREATE INDEX idx_tx_user_date ON transactions(user_id, deleted_at, transaction_date DESC, created_at DESC);",
		"CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_start);",
	}

	for _, stmt := range requiredUpStatements {
		if !strings.Contains(upSQL, stmt) {
			t.Errorf("000001_init_schema.up.sql missing expected statement: %q", stmt)
		}
	}

	downSQLBytes, err := os.ReadFile(filepath.Join(migrationsDir, "000001_init_schema.down.sql"))
	if err != nil {
		t.Fatalf("failed to read down migration file: %v", err)
	}
	downSQL := string(downSQLBytes)

	requiredDownStatements := []string{
		"DROP TABLE IF EXISTS ai_rate_limits;",
		"DROP TABLE IF EXISTS budgets;",
		"DROP TABLE IF EXISTS transactions;",
		"DROP TABLE IF EXISTS categories;",
		"DROP TABLE IF EXISTS accounts;",
		"DROP TABLE IF EXISTS auth_sessions;",
		"DROP TABLE IF EXISTS users;",
		"DROP TYPE IF EXISTS transaction_type;",
		"DROP TYPE IF EXISTS account_type;",
	}

	lastIndex := -1
	for _, stmt := range requiredDownStatements {
		idx := strings.Index(downSQL, stmt)
		if idx == -1 {
			t.Errorf("000001_init_schema.down.sql missing expected statement: %q", stmt)
			continue
		}
		if idx < lastIndex {
			t.Errorf("down migration statement %q is out of reverse-dependency order", stmt)
		}
		lastIndex = idx
	}
}

func TestNewDBPool_InvalidURL(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	_, err := NewDBPool(ctx, "postgres://invalid user:password@hostname:not_a_port/db")
	if err == nil {
		t.Fatal("expected error for invalid database URL, got nil")
	}
}

func TestNewDBPool_LiveConnection(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL is not set; skipping live database connection test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	pool, err := NewDBPool(ctx, dbURL)
	if err != nil {
		t.Skipf("skipping live database connection test (database not reachable): %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("failed to ping connected database: %v", err)
	}
}

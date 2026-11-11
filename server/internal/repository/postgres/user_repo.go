package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"finara/server/internal/domain"
)

type userRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) domain.UserRepository {
	return &userRepository{
		pool: pool,
	}
}

func (r *userRepository) Create(ctx context.Context, user *domain.User) error {
	var err error
	if user.ID != "" {
		query := `
			INSERT INTO users (id, email, password_hash, name)
			VALUES ($1, $2, $3, $4)
			RETURNING created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query, user.ID, user.Email, user.PasswordHash, user.Name).Scan(&user.CreatedAt, &user.UpdatedAt)
	} else {
		query := `
			INSERT INTO users (email, password_hash, name)
			VALUES ($1, $2, $3)
			RETURNING id, created_at, updated_at
		`
		err = r.pool.QueryRow(ctx, query, user.Email, user.PasswordHash, user.Name).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	var user domain.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, created_at, updated_at
		FROM users
		WHERE LOWER(email) = LOWER($1)
	`
	var user domain.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return &user, nil
}

func (r *userRepository) CreateSession(ctx context.Context, session *domain.Session) error {
	var err error
	if session.ID != "" {
		query := `
			INSERT INTO auth_sessions (id, user_id, token, expires_at)
			VALUES ($1, $2, $3, $4)
			RETURNING created_at
		`
		err = r.pool.QueryRow(ctx, query, session.ID, session.UserID, session.Token, session.ExpiresAt).Scan(&session.CreatedAt)
	} else {
		query := `
			INSERT INTO auth_sessions (user_id, token, expires_at)
			VALUES ($1, $2, $3)
			RETURNING id, created_at
		`
		err = r.pool.QueryRow(ctx, query, session.UserID, session.Token, session.ExpiresAt).Scan(&session.ID, &session.CreatedAt)
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (r *userRepository) GetSessionByToken(ctx context.Context, token string) (*domain.Session, error) {
	query := `
		SELECT id, user_id, token, expires_at, created_at
		FROM auth_sessions
		WHERE token = $1
	`
	var s domain.Session
	err := r.pool.QueryRow(ctx, query, token).Scan(
		&s.ID,
		&s.UserID,
		&s.Token,
		&s.ExpiresAt,
		&s.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get session by token: %w", err)
	}
	return &s, nil
}

func (r *userRepository) DeleteSession(ctx context.Context, token string) error {
	query := `DELETE FROM auth_sessions WHERE token = $1`
	_, err := r.pool.Exec(ctx, query, token)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (r *userRepository) RegisterAtomic(
	ctx context.Context,
	user *domain.User,
	session *domain.Session,
	defaultAccount *domain.Account,
	defaultCategories []domain.Category,
) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert user
	var errUser error
	if user.ID != "" {
		errUser = tx.QueryRow(ctx, `
			INSERT INTO users (id, email, password_hash, name)
			VALUES ($1, $2, $3, $4)
			RETURNING created_at, updated_at
		`, user.ID, user.Email, user.PasswordHash, user.Name).Scan(&user.CreatedAt, &user.UpdatedAt)
	} else {
		errUser = tx.QueryRow(ctx, `
			INSERT INTO users (email, password_hash, name)
			VALUES ($1, $2, $3)
			RETURNING id, created_at, updated_at
		`, user.Email, user.PasswordHash, user.Name).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	}
	if errUser != nil {
		var pgErr *pgconn.PgError
		if errors.As(errUser, &pgErr) && pgErr.Code == "23505" {
			return domain.ErrConflict
		}
		return fmt.Errorf("insert user: %w", errUser)
	}

	// 2. Insert session
	session.UserID = user.ID
	var errSession error
	if session.ID != "" {
		errSession = tx.QueryRow(ctx, `
			INSERT INTO auth_sessions (id, user_id, token, expires_at)
			VALUES ($1, $2, $3, $4)
			RETURNING created_at
		`, session.ID, session.UserID, session.Token, session.ExpiresAt).Scan(&session.CreatedAt)
	} else {
		errSession = tx.QueryRow(ctx, `
			INSERT INTO auth_sessions (user_id, token, expires_at)
			VALUES ($1, $2, $3)
			RETURNING id, created_at
		`, session.UserID, session.Token, session.ExpiresAt).Scan(&session.ID, &session.CreatedAt)
	}
	if errSession != nil {
		return fmt.Errorf("insert session: %w", errSession)
	}

	// 3. Insert default account
	defaultAccount.UserID = user.ID
	if defaultAccount.OpeningBalanceAt.IsZero() {
		defaultAccount.OpeningBalanceAt = time.Now()
	}
	var errAccount error
	if defaultAccount.ID != "" {
		errAccount = tx.QueryRow(ctx, `
			INSERT INTO accounts (id, user_id, name, type, opening_balance, opening_balance_at)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING created_at, updated_at
		`, defaultAccount.ID, defaultAccount.UserID, defaultAccount.Name, string(defaultAccount.Type), defaultAccount.OpeningBalance, defaultAccount.OpeningBalanceAt).Scan(&defaultAccount.CreatedAt, &defaultAccount.UpdatedAt)
	} else {
		errAccount = tx.QueryRow(ctx, `
			INSERT INTO accounts (user_id, name, type, opening_balance, opening_balance_at)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at, updated_at
		`, defaultAccount.UserID, defaultAccount.Name, string(defaultAccount.Type), defaultAccount.OpeningBalance, defaultAccount.OpeningBalanceAt).Scan(&defaultAccount.ID, &defaultAccount.CreatedAt, &defaultAccount.UpdatedAt)
	}
	if errAccount != nil {
		return fmt.Errorf("insert default account: %w", errAccount)
	}

	// 4. Insert default categories
	for i := range defaultCategories {
		defaultCategories[i].UserID = user.ID
		var errCat error
		if defaultCategories[i].ID != "" {
			errCat = tx.QueryRow(ctx, `
				INSERT INTO categories (id, user_id, name, type)
				VALUES ($1, $2, $3, $4)
				RETURNING created_at, updated_at
			`, defaultCategories[i].ID, defaultCategories[i].UserID, defaultCategories[i].Name, string(defaultCategories[i].Type)).Scan(&defaultCategories[i].CreatedAt, &defaultCategories[i].UpdatedAt)
		} else {
			errCat = tx.QueryRow(ctx, `
				INSERT INTO categories (user_id, name, type)
				VALUES ($1, $2, $3)
				RETURNING id, created_at, updated_at
			`, defaultCategories[i].UserID, defaultCategories[i].Name, string(defaultCategories[i].Type)).Scan(&defaultCategories[i].ID, &defaultCategories[i].CreatedAt, &defaultCategories[i].UpdatedAt)
		}
		if errCat != nil {
			return fmt.Errorf("insert category %s: %w", defaultCategories[i].Name, errCat)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit registration transaction: %w", err)
	}

	return nil
}

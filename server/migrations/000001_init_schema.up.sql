-- Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

-- Accounts
CREATE TYPE account_type AS ENUM ('CASH', 'BANK', 'E_WALLET');

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type account_type NOT NULL,
    opening_balance BIGINT NOT NULL DEFAULT 0,
    opening_balance_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_account_user UNIQUE (id, user_id)
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Categories
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    type transaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_category_user_type UNIQUE (id, user_id, type)
);
CREATE INDEX idx_categories_user_type ON categories(user_id, type);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_time TIME,
    client_request_id UUID NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_tx_account FOREIGN KEY (account_id, user_id) REFERENCES accounts(id, user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_category FOREIGN KEY (category_id, user_id, type) REFERENCES categories(id, user_id, type) ON DELETE RESTRICT,
    CONSTRAINT uq_tx_client_request UNIQUE (user_id, client_request_id)
);
CREATE INDEX idx_tx_user_date ON transactions(user_id, deleted_at, transaction_date DESC, created_at DESC);

-- Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL,
    category_type transaction_type NOT NULL DEFAULT 'EXPENSE',
    period_start DATE NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_budget_category FOREIGN KEY (category_id, user_id, category_type) REFERENCES categories(id, user_id, type) ON DELETE RESTRICT,
    CONSTRAINT uq_budget_user_cat_period UNIQUE (user_id, category_id, period_start)
);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, period_start);

-- AI Rate Limiting
CREATE TABLE ai_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

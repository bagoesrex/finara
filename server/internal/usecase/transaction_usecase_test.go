package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"finara/server/internal/domain"
	"finara/server/internal/usecase"
)

type mockAccountRepo struct {
	accounts map[string]*domain.Account
}

func (m *mockAccountRepo) Create(ctx context.Context, account *domain.Account) error {
	m.accounts[account.ID] = account
	return nil
}

func (m *mockAccountRepo) GetByID(ctx context.Context, userID, accountID string) (*domain.Account, error) {
	acc, exists := m.accounts[accountID]
	if !exists || acc.UserID != userID {
		return nil, domain.ErrAccountNotFound
	}
	return acc, nil
}

func (m *mockAccountRepo) ListByUserID(ctx context.Context, userID string) ([]domain.Account, error) {
	var list []domain.Account
	for _, acc := range m.accounts {
		if acc.UserID == userID {
			list = append(list, *acc)
		}
	}
	return list, nil
}

type mockCategoryRepo struct {
	categories map[string]*domain.Category
}

func (m *mockCategoryRepo) Create(ctx context.Context, category *domain.Category) error {
	m.categories[category.ID] = category
	return nil
}

func (m *mockCategoryRepo) GetByID(ctx context.Context, userID, categoryID string) (*domain.Category, error) {
	cat, exists := m.categories[categoryID]
	if !exists || cat.UserID != userID {
		return nil, domain.ErrCategoryNotFound
	}
	return cat, nil
}

func (m *mockCategoryRepo) ListByUserID(ctx context.Context, userID string) ([]domain.Category, error) {
	var list []domain.Category
	for _, cat := range m.categories {
		if cat.UserID == userID {
			list = append(list, *cat)
		}
	}
	return list, nil
}

type mockTransactionRepo struct {
	transactions         map[string]*domain.Transaction
	byClientReqID        map[string]*domain.Transaction
	createErr            error
	snapshotTotalBalance int64
	snapshotIncome       int64
	snapshotExpense      int64
}

func newMockTransactionRepo() *mockTransactionRepo {
	return &mockTransactionRepo{
		transactions:  make(map[string]*domain.Transaction),
		byClientReqID: make(map[string]*domain.Transaction),
	}
}

func (m *mockTransactionRepo) Create(ctx context.Context, tx *domain.Transaction) error {
	if m.createErr != nil {
		return m.createErr
	}
	key := tx.UserID + ":" + tx.ClientRequestID
	if _, exists := m.byClientReqID[key]; exists {
		return domain.ErrDuplicateRequest
	}
	if tx.ID == "" {
		tx.ID = "tx-" + tx.ClientRequestID
	}
	tx.CreatedAt = time.Now()
	tx.UpdatedAt = time.Now()
	m.transactions[tx.ID] = tx
	m.byClientReqID[key] = tx
	return nil
}

func (m *mockTransactionRepo) GetByID(ctx context.Context, userID, txID string) (*domain.Transaction, error) {
	tx, exists := m.transactions[txID]
	if !exists || tx.UserID != userID || tx.DeletedAt != nil {
		return nil, domain.ErrNotFound
	}
	return tx, nil
}

func (m *mockTransactionRepo) GetByClientRequestID(ctx context.Context, userID, clientRequestID string) (*domain.Transaction, error) {
	key := userID + ":" + clientRequestID
	tx, exists := m.byClientReqID[key]
	if !exists || tx.DeletedAt != nil {
		return nil, domain.ErrNotFound
	}
	return tx, nil
}

func (m *mockTransactionRepo) List(ctx context.Context, filter domain.TransactionFilter) ([]domain.Transaction, error) {
	var list []domain.Transaction
	for _, tx := range m.transactions {
		if tx.UserID != filter.UserID || tx.DeletedAt != nil {
			continue
		}
		if filter.AccountID != nil && tx.AccountID != *filter.AccountID {
			continue
		}
		if filter.CategoryID != nil && tx.CategoryID != *filter.CategoryID {
			continue
		}
		if filter.Type != nil && tx.Type != *filter.Type {
			continue
		}
		list = append(list, *tx)
	}
	return list, nil
}

func (m *mockTransactionRepo) Update(ctx context.Context, tx *domain.Transaction) error {
	existing, exists := m.transactions[tx.ID]
	if !exists || existing.UserID != tx.UserID || existing.DeletedAt != nil {
		return domain.ErrNotFound
	}
	tx.UpdatedAt = time.Now()
	m.transactions[tx.ID] = tx
	return nil
}

func (m *mockTransactionRepo) SoftDelete(ctx context.Context, userID, txID string) error {
	tx, exists := m.transactions[txID]
	if !exists || tx.UserID != userID || tx.DeletedAt != nil {
		return domain.ErrNotFound
	}
	now := time.Now()
	tx.DeletedAt = &now
	return nil
}

func (m *mockTransactionRepo) GetMonthlySnapshot(ctx context.Context, userID string, start, end time.Time) (*domain.FinancialSnapshot, error) {
	return &domain.FinancialSnapshot{
		TotalBalance:   m.snapshotTotalBalance,
		MonthlyIncome:  m.snapshotIncome,
		MonthlyExpense: m.snapshotExpense,
	}, nil
}

func TestTransactionUsecase_Create(t *testing.T) {
	userID := "user-123"
	accID := "acc-1"
	catExpenseID := "cat-expense"
	catIncomeID := "cat-income"

	accRepo := &mockAccountRepo{
		accounts: map[string]*domain.Account{
			accID: {ID: accID, UserID: userID, Name: "Dompet Utama"},
		},
	}
	catRepo := &mockCategoryRepo{
		categories: map[string]*domain.Category{
			catExpenseID: {ID: catExpenseID, UserID: userID, Name: "Makanan", Type: domain.TransactionTypeExpense},
			catIncomeID:  {ID: catIncomeID, UserID: userID, Name: "Gaji", Type: domain.TransactionTypeIncome},
		},
	}
	txRepo := newMockTransactionRepo()
	uc := usecase.NewTransactionUsecase(txRepo, accRepo, catRepo)

	ctx := context.Background()

	t.Run("success creating expense transaction", func(t *testing.T) {
		tx := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      catExpenseID,
			Type:            domain.TransactionTypeExpense,
			Amount:          50000,
			Description:     "Nasi Padang",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-1",
		}

		res, err := uc.Create(ctx, tx)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}
		if res.ID == "" {
			t.Errorf("expected ID to be set")
		}
		if res.AccountName != "Dompet Utama" {
			t.Errorf("expected account name 'Dompet Utama', got %s", res.AccountName)
		}
		if res.CategoryName != "Makanan" {
			t.Errorf("expected category name 'Makanan', got %s", res.CategoryName)
		}
	})

	t.Run("duplicate client_request_id returns existing transaction idempotently", func(t *testing.T) {
		// First insert
		tx1 := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      catExpenseID,
			Type:            domain.TransactionTypeExpense,
			Amount:          50000,
			Description:     "Nasi Padang",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-idempotent",
		}
		res1, err := uc.Create(ctx, tx1)
		if err != nil {
			t.Fatalf("first create failed: %v", err)
		}

		// Second duplicate insert with same client_request_id
		tx2 := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      catExpenseID,
			Type:            domain.TransactionTypeExpense,
			Amount:          50000,
			Description:     "Nasi Padang Duplicate",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-idempotent",
		}
		res2, err := uc.Create(ctx, tx2)
		if err != nil {
			t.Fatalf("duplicate create should succeed idempotently, got: %v", err)
		}
		if res2.ID != res1.ID {
			t.Errorf("expected duplicate to return original transaction ID %s, got %s", res1.ID, res2.ID)
		}
	})

	t.Run("fails when amount is invalid", func(t *testing.T) {
		tx := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      catExpenseID,
			Type:            domain.TransactionTypeExpense,
			Amount:          0,
			Description:     "Free",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-zero-amount",
		}
		_, err := uc.Create(ctx, tx)
		if !errors.Is(err, domain.ErrInvalidAmount) {
			t.Errorf("expected ErrInvalidAmount, got %v", err)
		}
	})

	t.Run("fails when account not found", func(t *testing.T) {
		tx := &domain.Transaction{
			UserID:          userID,
			AccountID:       "acc-nonexistent",
			CategoryID:      catExpenseID,
			Type:            domain.TransactionTypeExpense,
			Amount:          10000,
			Description:     "Snack",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-acc-none",
		}
		_, err := uc.Create(ctx, tx)
		if !errors.Is(err, domain.ErrAccountNotFound) {
			t.Errorf("expected ErrAccountNotFound, got %v", err)
		}
	})

	t.Run("fails when category not found", func(t *testing.T) {
		tx := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      "cat-nonexistent",
			Type:            domain.TransactionTypeExpense,
			Amount:          10000,
			Description:     "Snack",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-cat-none",
		}
		_, err := uc.Create(ctx, tx)
		if !errors.Is(err, domain.ErrCategoryNotFound) {
			t.Errorf("expected ErrCategoryNotFound, got %v", err)
		}
	})

	t.Run("fails when category type does not match transaction type", func(t *testing.T) {
		tx := &domain.Transaction{
			UserID:          userID,
			AccountID:       accID,
			CategoryID:      catIncomeID, // Income category
			Type:            domain.TransactionTypeExpense, // Expense tx
			Amount:          10000,
			Description:     "Mismatch",
			TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
			ClientRequestID: "req-mismatch",
		}
		_, err := uc.Create(ctx, tx)
		if !errors.Is(err, domain.ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput for mismatched category type, got %v", err)
		}
	})
}

func TestTransactionUsecase_Update(t *testing.T) {
	userID := "user-123"
	accID := "acc-1"
	catExpenseID := "cat-expense"

	accRepo := &mockAccountRepo{
		accounts: map[string]*domain.Account{
			accID: {ID: accID, UserID: userID, Name: "Dompet"},
		},
	}
	catRepo := &mockCategoryRepo{
		categories: map[string]*domain.Category{
			catExpenseID: {ID: catExpenseID, UserID: userID, Name: "Makan", Type: domain.TransactionTypeExpense},
		},
	}
	txRepo := newMockTransactionRepo()
	uc := usecase.NewTransactionUsecase(txRepo, accRepo, catRepo)
	ctx := context.Background()

	origTx := &domain.Transaction{
		ID:              "tx-update-test",
		UserID:          userID,
		AccountID:       accID,
		CategoryID:      catExpenseID,
		Type:            domain.TransactionTypeExpense,
		Amount:          25000,
		Description:     "Sarapan",
		TransactionDate: time.Date(2026, 11, 12, 0, 0, 0, 0, time.UTC),
		ClientRequestID: "req-update-1",
	}
	_, _ = uc.Create(ctx, origTx)

	t.Run("successful update", func(t *testing.T) {
		newAmount := int64(30000)
		newDesc := "Sarapan Lengkap"
		res, err := uc.Update(ctx, userID, origTx.ID, usecase.UpdateTransactionInput{
			Amount:      &newAmount,
			Description: &newDesc,
		})
		if err != nil {
			t.Fatalf("update failed: %v", err)
		}
		if res.Amount != 30000 || res.Description != "Sarapan Lengkap" {
			t.Errorf("updated fields do not match")
		}
	})

	t.Run("fails when updating with negative amount", func(t *testing.T) {
		negAmount := int64(-500)
		_, err := uc.Update(ctx, userID, origTx.ID, usecase.UpdateTransactionInput{
			Amount: &negAmount,
		})
		if !errors.Is(err, domain.ErrInvalidAmount) {
			t.Errorf("expected ErrInvalidAmount, got %v", err)
		}
	})

	t.Run("fails for another user's transaction", func(t *testing.T) {
		newAmount := int64(10000)
		_, err := uc.Update(ctx, "user-other", origTx.ID, usecase.UpdateTransactionInput{
			Amount: &newAmount,
		})
		if !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("expected ErrNotFound for wrong user, got %v", err)
		}
	})
}

func TestTransactionUsecase_Delete(t *testing.T) {
	userID := "user-123"
	txRepo := newMockTransactionRepo()
	accRepo := &mockAccountRepo{accounts: map[string]*domain.Account{}}
	catRepo := &mockCategoryRepo{categories: map[string]*domain.Category{}}
	uc := usecase.NewTransactionUsecase(txRepo, accRepo, catRepo)
	ctx := context.Background()

	tx := &domain.Transaction{
		ID:              "tx-del",
		UserID:          userID,
		AccountID:       "acc-1",
		CategoryID:      "cat-1",
		Type:            domain.TransactionTypeExpense,
		Amount:          10000,
		Description:     "To delete",
		TransactionDate: time.Now(),
		ClientRequestID: "req-del",
	}
	_ = txRepo.Create(ctx, tx)

	t.Run("successful soft delete", func(t *testing.T) {
		err := uc.Delete(ctx, userID, "tx-del")
		if err != nil {
			t.Fatalf("delete failed: %v", err)
		}
		// Try to fetch again
		_, err = uc.GetByID(ctx, userID, "tx-del")
		if !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("expected ErrNotFound after soft delete, got %v", err)
		}
	})

	t.Run("delete by another user returns not found", func(t *testing.T) {
		err := uc.Delete(ctx, "user-stranger", "tx-del")
		if !errors.Is(err, domain.ErrNotFound) {
			t.Errorf("expected ErrNotFound, got %v", err)
		}
	})
}

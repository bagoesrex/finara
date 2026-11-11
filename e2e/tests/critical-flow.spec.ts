import { test, expect } from '@playwright/test';
import { setupMockApi } from './mock-api';

test.describe('Critical Mobile User Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Flow 1: Zero Onboarding Registration immediately jumps to Home', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/');

    // Switch to Register tab
    const registerTab = page.getByRole('tab', { name: 'Daftar' });
    await expect(registerTab).toBeVisible();
    await registerTab.click();

    // Fill registration credentials
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');

    // Click register CTA
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    // Verify immediate jump to Home without onboarding wizards or extra steps
    const heroBalance = page.getByTestId('hero-balance');
    await expect(heroBalance).toBeVisible();
    await expect(heroBalance).toHaveText('Rp 0');

    // Monthly income and expense cards render with 0
    await expect(page.getByTestId('monthly-income')).toHaveText('Rp 0');
    await expect(page.getByTestId('monthly-expense')).toHaveText('Rp 0');

    // Manual action button and AI Composer are directly accessible
    await expect(page.getByRole('button', { name: 'Tambah manual' })).toBeVisible();
    await expect(page.getByLabel('Tulis transaksi alami')).toBeVisible();
  });

  test('Flow 2: AI Composer natural language transaction entry', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/');

    // Register user first
    await page.getByRole('tab', { name: 'Daftar' }).click();
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    await expect(page.getByTestId('hero-balance')).toBeVisible();

    // Type natural language transaction into AI composer
    const aiInput = page.getByLabel('Tulis transaksi alami');
    await aiInput.fill('makan padang 25rb');

    // Submit natural language input
    const aiSubmitBtn = page.getByLabel('Kirim draf transaksi');
    await aiSubmitBtn.click();

    // Confirmation sheet opens
    await expect(page.getByRole('heading', { name: 'Konfirmasi Transaksi' })).toBeVisible();

    // Verify prefilled amount (formatted with dot separator) and description
    const amountInput = page.locator('#tx-amount');
    await expect(amountInput).toHaveValue('25.000');
    await expect(page.locator('#tx-desc')).toHaveValue('Makan padang');

    // Save transaction
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    // Confirmation sheet closes
    await expect(page.getByRole('heading', { name: 'Konfirmasi Transaksi' })).not.toBeVisible();

    // Verify transaction appears in recent list
    const recentList = page.getByTestId('recent-transactions-list');
    await expect(recentList).toBeVisible();
    await expect(recentList).toContainText('Makan padang');
    await expect(recentList).toContainText('-Rp 25.000');

    // Verify optimistic balance update
    await expect(page.getByTestId('hero-balance')).toHaveText('-Rp 25.000');
    await expect(page.getByTestId('monthly-expense')).toHaveText('Rp 25.000');
  });

  test('Flow 3: Manual transaction entry with strict numeric validation', async ({ page }) => {
    await setupMockApi(page);
    await page.goto('/');

    // Register and navigate to Home
    await page.getByRole('tab', { name: 'Daftar' }).click();
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    await expect(page.getByTestId('hero-balance')).toBeVisible();

    // Open manual entry drawer
    await page.getByRole('button', { name: 'Tambah manual' }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Transaksi' })).toBeVisible();

    const amountInput = page.locator('#tx-amount');

    // Inspect mobile keypad attributes
    await expect(amountInput).toHaveAttribute('inputMode', 'numeric');
    await expect(amountInput).toHaveAttribute('pattern', '[0-9]*');

    // Focus and attempt to type non-digit characters
    await amountInput.click();
    await amountInput.pressSequentially('abc-+,.');
    await expect(amountInput).toHaveValue('');

    // Type valid numeric amount
    await amountInput.pressSequentially('50000');
    await expect(amountInput).toHaveValue('50.000');

    // Enter description
    await page.locator('#tx-desc').fill('Beli bensin pertamax');

    // Select category (Transport)
    await page.getByRole('button', { name: 'Transport' }).click();

    // Save transaction
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    // Sheet closes and recent list displays new transaction
    await expect(page.getByRole('heading', { name: 'Tambah Transaksi' })).not.toBeVisible();
    const recentList = page.getByTestId('recent-transactions-list');
    await expect(recentList).toContainText('Beli bensin pertamax');
    await expect(recentList).toContainText('-Rp 50.000');
  });

  test('Flow 4: Monthly category budget allocation and progress gauge', async ({ page }) => {
    const mockState = await setupMockApi(page);

    // Seed an initial transaction to verify spent progress
    mockState.transactions.push({
      id: 'tx_seed_1',
      user_id: 'user_1',
      account_id: 'acc_cash',
      category_id: 'cat_food',
      type: 'EXPENSE',
      amount: 75000,
      description: 'Makan siang restoran',
      transaction_date: new Date().toISOString().split('T')[0],
      client_request_id: 'req_seed_1',
      account_name: 'Tunai',
      category_name: 'Makanan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockState.snapshot.total_balance = -75000;
    mockState.snapshot.monthly_expense = 75000;

    await page.goto('/');

    // Register user
    await page.getByRole('tab', { name: 'Daftar' }).click();
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    await expect(page.getByTestId('hero-balance')).toBeVisible();

    // Switch to Budget tab
    await page.getByRole('tab', { name: 'Budget' }).click();
    await expect(page.getByTestId('current-month-display')).toBeVisible();

    // Open Budget Allocation Sheet
    await page.getByRole('button', { name: 'Alokasi Budget' }).first().click();
    await expect(page.getByRole('heading', { name: 'Alokasi Budget' })).toBeVisible();

    // Select "Makanan" category
    await page.getByRole('button', { name: 'Makanan' }).click();

    // Assert numeric input constraints on budget input
    const budgetAmountInput = page.locator('#budget-amount-input');
    await expect(budgetAmountInput).toHaveAttribute('inputMode', 'numeric');
    await expect(budgetAmountInput).toHaveAttribute('pattern', '[0-9]*');

    // Enter budget limit: Rp 500.000
    await budgetAmountInput.fill('500000');
    await expect(budgetAmountInput).toHaveValue('500.000');

    // Save allocation
    await page.getByRole('button', { name: 'Simpan', exact: true }).click();

    // Verification: Category budget card displays spent, budget, remaining, and progress
    const budgetCard = page.getByTestId('budget-item-cat_food');
    await expect(budgetCard).toBeVisible();
    await expect(budgetCard).toContainText('Makanan');
    await expect(budgetCard).toContainText('Rp 75.000');
    await expect(budgetCard).toContainText('Rp 500.000');
    await expect(budgetCard).toContainText('Sisa Rp 425.000');

    // Linear progress gauge
    const progressBar = budgetCard.getByRole('progressbar');
    await expect(progressBar).toBeVisible();
    await expect(progressBar).toHaveAttribute('aria-label', 'Progress budget Makanan');
    // Spent 75k of 500k = 15%
    await expect(progressBar).toHaveAttribute('aria-valuenow', '15');
  });
});

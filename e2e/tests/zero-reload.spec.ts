import { test, expect } from '@playwright/test';
import { setupMockApi } from './mock-api';

test.describe('Zero-Reload Navigation & Persistent Cache', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Flow 5a: Seamless zero-reload tab navigation without full page refresh', async ({ page }) => {
    const mockState = await setupMockApi(page);

    // Seed some data so tabs have content
    mockState.transactions.push({
      id: 'tx_seed_1',
      user_id: 'user_1',
      account_id: 'acc_cash',
      category_id: 'cat_food',
      type: 'EXPENSE',
      amount: 45000,
      description: 'Makan siang ayam geprek',
      transaction_date: new Date().toISOString().split('T')[0],
      client_request_id: 'req_seed_1',
      account_name: 'Tunai',
      category_name: 'Makanan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockState.snapshot.total_balance = 250000;
    mockState.snapshot.monthly_expense = 45000;

    await page.goto('/');

    // Register to establish authenticated state
    await page.getByRole('tab', { name: 'Daftar' }).click();
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    // Verify Home tab is active
    await expect(page.getByTestId('hero-balance')).toBeVisible();

    // Attach SPA marker to verify that full page reloads do not occur during tab transitions
    await page.evaluate(() => {
      (window as unknown as { __spa_session_marker: string }).__spa_session_marker = 'active_session';
    });

    // 1. Navigate to Aktivitas tab
    await page.getByRole('tab', { name: 'Aktivitas' }).click();
    await expect(page.getByPlaceholder('Cari transaksi...')).toBeVisible();
    await expect(page.getByTestId('transactions-list')).toBeVisible();
    await expect(page.getByTestId('transactions-list')).toContainText('Makan siang ayam geprek');

    // Verify SPA window object remained in memory (zero reload)
    const markerAfterAktivitas = await page.evaluate(
      () => (window as unknown as { __spa_session_marker?: string }).__spa_session_marker
    );
    expect(markerAfterAktivitas).toBe('active_session');

    // 2. Navigate to Budget tab
    await page.getByRole('tab', { name: 'Budget' }).click();
    await expect(page.getByTestId('current-month-display')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Alokasi Budget' }).first()).toBeVisible();

    // Verify zero reload
    const markerAfterBudget = await page.evaluate(
      () => (window as unknown as { __spa_session_marker?: string }).__spa_session_marker
    );
    expect(markerAfterBudget).toBe('active_session');

    // 3. Navigate back to Home tab
    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(page.getByTestId('hero-balance')).toBeVisible();
    await expect(page.getByTestId('recent-transactions-list')).toBeVisible();

    // Verify zero reload
    const markerAfterHome = await page.evaluate(
      () => (window as unknown as { __spa_session_marker?: string }).__spa_session_marker
    );
    expect(markerAfterHome).toBe('active_session');
  });

  test('Flow 5b: Persisted session and query cache restores immediately on page reload', async ({ page }) => {
    const mockState = await setupMockApi(page);

    mockState.transactions.push({
      id: 'tx_seed_persist',
      user_id: 'user_1',
      account_id: 'acc_cash',
      category_id: 'cat_food',
      type: 'EXPENSE',
      amount: 30000,
      description: 'Kopi Kenangan',
      transaction_date: new Date().toISOString().split('T')[0],
      client_request_id: 'req_seed_persist',
      account_name: 'Tunai',
      category_name: 'Makanan',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockState.snapshot.total_balance = 500000;
    mockState.snapshot.monthly_expense = 30000;

    await page.goto('/');

    // Register user
    await page.getByRole('tab', { name: 'Daftar' }).click();
    await page.locator('#auth-name').fill('Bagus Finara');
    await page.locator('#auth-email').fill('bagus@finara.app');
    await page.locator('#auth-password').fill('securepassword123');
    await page.getByRole('button', { name: 'Daftar', exact: true }).click();

    await expect(page.getByTestId('hero-balance')).toBeVisible();
    await expect(page.getByTestId('hero-balance')).toHaveText('Rp 500.000');
    await expect(page.getByTestId('recent-transactions-list')).toContainText('Kopi Kenangan');

    // Verify token was stored in localStorage
    const storedToken = await page.evaluate(() => window.localStorage.getItem('finara_token'));
    expect(storedToken).toBeTruthy();

    // Trigger hard page reload
    await page.reload();

    // Verify session restores directly into HomeDashboard without redirecting to login
    await expect(page.getByTestId('hero-balance')).toBeVisible();
    await expect(page.getByTestId('hero-balance')).toHaveText('Rp 500.000');
    await expect(page.getByTestId('recent-transactions-list')).toContainText('Kopi Kenangan');

    // Ensure AuthPages is NOT shown
    await expect(page.getByRole('tab', { name: 'Masuk' })).not.toBeVisible();
    await expect(page.locator('#auth-email')).not.toBeVisible();
  });
});

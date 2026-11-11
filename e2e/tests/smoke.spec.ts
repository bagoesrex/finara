import { test, expect } from '@playwright/test';

test.describe('Application smoke test', () => {
  test('should render Finara app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Finara/);
  });
});

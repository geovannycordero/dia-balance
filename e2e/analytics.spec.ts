import { test, expect } from '@playwright/test';

test.describe('Analytics page', () => {
  test.setTimeout(45_000);
  test.beforeEach(async ({ page }) => {
    await page.goto('/analytics');
    // Wait for either the data to render or the empty-state message
    await page
      .locator('[data-testid="time-in-ranges"]')
      .or(page.getByText('Not enough data yet to surface'))
      .waitFor({ timeout: 15_000 });
  });

  test('page loads with correct title', async ({ page }) => {
    await expect(page.getByText('Analytics & insights')).toBeVisible();
    await expect(page.getByText('Dia Balance')).toBeVisible();
  });

  test('glucose overview section is visible', async ({ page }) => {
    // Switch to Last 14 days which has seeded data
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="time-in-ranges"]').waitFor({ timeout: 15_000 });

    await expect(page.getByText('Time in Ranges')).toBeVisible();
    await expect(page.getByText('Glucose Statistics')).toBeVisible();
  });

  test('time in ranges shows 5 zones', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="time-in-ranges"]').waitFor({ timeout: 15_000 });

    const tir = page.locator('[data-testid="time-in-ranges"]');
    await expect(tir.getByText('Very High', { exact: true })).toBeVisible();
    await expect(tir.getByText('High', { exact: true })).toBeVisible();
    await expect(tir.getByText('Target Range', { exact: true })).toBeVisible();
    await expect(tir.getByText('Low', { exact: true })).toBeVisible();
    await expect(tir.getByText('Very Low', { exact: true })).toBeVisible();
  });

  test('glucose stats panel shows key metrics', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="glucose-stats"]').waitFor({ timeout: 15_000 });

    const stats = page.locator('[data-testid="glucose-stats"]');
    await expect(stats.getByText('Average Glucose', { exact: true })).toBeVisible();
    await expect(stats.getByText('Glucose Management Indicator (GMI)', { exact: true })).toBeVisible();
    await expect(stats.getByText('Glucose Variability (%CV)', { exact: true })).toBeVisible();
  });

  test('AGP chart is visible', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="agp-chart"]').waitFor({ timeout: 15_000 });

    await expect(page.locator('[data-testid="agp-chart"]')).toBeVisible();
    await expect(page.getByText('Ambulatory Glucose Profile (AGP)')).toBeVisible();
  });

  test('glucose patterns chart is visible', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="glucose-patterns"]').waitFor({ timeout: 15_000 });

    await expect(page.locator('[data-testid="glucose-patterns"]')).toBeVisible();
    await expect(page.getByText('Glucose Patterns')).toBeVisible();
  });

  test('date range preset changes data', async ({ page }) => {
    // Switch preset and confirm page updates (loading indicator appears then disappears)
    await page.selectOption('select', '30d');
    // Loading skeleton may appear
    await page
      .locator('[data-testid="time-in-ranges"]')
      .or(page.getByText('Not enough data yet to surface'))
      .waitFor({ timeout: 15_000 });
    // Page should still render without error
    await expect(page.getByText('Analytics & insights')).toBeVisible();
  });

  test('CSV download button is enabled when data is loaded', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="time-in-ranges"]').waitFor({ timeout: 15_000 });

    const csvBtn = page.getByRole('button', { name: 'CSV' });
    await expect(csvBtn).toBeEnabled();
  });

  test('PDF download button is enabled when data is loaded', async ({ page }) => {
    await page.selectOption('select', '14d');
    await page.locator('[data-testid="time-in-ranges"]').waitFor({ timeout: 15_000 });

    const pdfBtn = page.getByRole('button', { name: 'PDF' });
    await expect(pdfBtn).toBeEnabled();
  });
});

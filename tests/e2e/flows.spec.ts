import { test, expect, Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL || 'vojtech.sebek@sebit.cz';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Leopardi556655@';

async function loginUser(page: Page) {
    await page.goto('/login');
    await page.locator('input').first().fill(TEST_EMAIL);
    await page.locator('input').nth(1).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('AML Check Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should navigate to AML section', async ({ page }) => {
        await page.goto('/aml');
        await expect(page).toHaveURL(/\/aml/);
    });

    test('should have AML tester/check form', async ({ page }) => {
        await page.goto('/aml/tester');
        await page.waitForLoadState('networkidle');

        // Look for search/name input
        const input = page.locator('input[type="text"], input[type="search"]');
        await expect(input.first()).toBeVisible({ timeout: 10000 });
    });

    test('should perform AML check and show results', async ({ page }) => {
        await page.goto('/aml/tester');
        await page.waitForLoadState('networkidle');

        // Enter name and search
        const input = page.locator('input').first();
        await input.fill('John Doe');

        // Find and click search button
        const searchButton = page.getByRole('button').first();
        await searchButton.click();

        // Wait for results
        await page.waitForLoadState('networkidle');
    });

    test('should show sanctions dashboard', async ({ page }) => {
        await page.goto('/aml/sanctions');
        await expect(page).toHaveURL(/\/aml\/sanctions/);
        await page.waitForLoadState('networkidle');
    });
});

test.describe('Accounting Reports Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should navigate to accounting section', async ({ page }) => {
        await page.goto('/accounting');
        await expect(page).toHaveURL(/\/accounting/);
    });

    test('should view profit & loss report', async ({ page }) => {
        await page.goto('/accounting/reports/profit-loss');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/accounting\/reports\/profit-loss/);
    });

    test('should view balance sheet', async ({ page }) => {
        await page.goto('/accounting/reports/balance-sheet');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/accounting\/reports\/balance-sheet/);
    });

    test('should view journal entries', async ({ page }) => {
        await page.goto('/accounting/reports/journal');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/accounting\/reports\/journal/);
    });

    test('should load general ledger page', async ({ page }) => {
        await page.goto('/accounting/reports/general-ledger');
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/\/accounting\/reports\/general-ledger/);
    });
});

test.describe('Payroll View Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should navigate to payroll section', async ({ page }) => {
        await page.goto('/administrace');
        await page.waitForLoadState('networkidle');
    });

    test('should display worker list', async ({ page }) => {
        await page.goto('/administrace');
        await page.waitForLoadState('networkidle');

        // Should show table or list
        const table = page.locator('table, [class*="list"], [class*="grid"]');
        await expect(table.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have date selector', async ({ page }) => {
        await page.goto('/administrace');
        await page.waitForLoadState('networkidle');

        // Look for date/period selector
        const dateSelector = page.locator('[class*="month"], [class*="year"], select, input');
        expect(await dateSelector.count()).toBeGreaterThan(0);
    });
});

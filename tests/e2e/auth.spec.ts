import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'vojtech.sebek@sebit.cz';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Leopardi556655@';

test.describe('Authentication Flow', () => {
    test('should show login page when not authenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/(login|auth)/);
    });

    test('should display login form with email and password fields', async ({ page }) => {
        await page.goto('/login');

        // Use Czech labels that match actual page structure
        await expect(page.getByText('Email')).toBeVisible();
        await expect(page.getByText('Heslo')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Přihlásit se', exact: true })).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill inputs by position (email first, password second)
        await page.locator('input').first().fill('invalid@test.com');
        await page.locator('input').nth(1).fill('wrongpassword');
        await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();

        // Should show error (alert role exists in page snapshot)
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect to dashboard after successful login', async ({ page }) => {
        await page.goto('/login');

        await page.locator('input').first().fill(TEST_EMAIL);
        await page.locator('input').nth(1).fill(TEST_PASSWORD);
        await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();

        // Wait for redirect to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });
});

async function loginUser(page: Page) {
    await page.goto('/login');
    await page.locator('input').first().fill(TEST_EMAIL);
    await page.locator('input').nth(1).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('Dashboard Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginUser(page);
    });

    test('should display dashboard with content', async ({ page }) => {
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    test('should have working navigation', async ({ page }) => {
        const sidebar = page.locator('nav, aside, [class*="sidebar"]');
        await expect(sidebar.first()).toBeVisible();
        expect(await page.getByRole('link').count()).toBeGreaterThan(0);
    });
});

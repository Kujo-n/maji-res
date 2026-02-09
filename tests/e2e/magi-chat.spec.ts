import { test, expect } from '@playwright/test';

/**
 * MAGI Chat E2E Tests
 * 
 * These tests verify the core UI functionality of the MAGI system.
 * Run with: npm run test:e2e
 * 
 * Note: Some tests require authentication. Those tests are skipped when not logged in.
 */

test.describe('MAGI Application - Basic Tests', () => {
  
  test('should load the application and show login or chat page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Should either show login page or chat page
    const hasLoginButton = await page.locator('button:has-text("Google")').isVisible().catch(() => false);
    const hasLoginText = await page.locator('text=/ログイン|Login/i').isVisible().catch(() => false);
    const hasChatInput = await page.locator('textarea').isVisible().catch(() => false);
    
    // One of these should be true
    expect(hasLoginButton || hasLoginText || hasChatInput).toBeTruthy();
    
    console.log('Login button:', hasLoginButton);
    console.log('Login text:', hasLoginText);
    console.log('Chat input:', hasChatInput);
  });

  test('login page should have Google login button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Look for Google login button
    const googleButton = page.locator('button:has-text("Google"), a:has-text("Google")');
    await expect(googleButton).toBeVisible({ timeout: 10000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login page or if login elements are visible
    const url = page.url();
    const hasLoginElements = await page.locator('text=/ログイン|Google/i').isVisible().catch(() => false);
    
    // Either redirected to /login or showing login UI
    const isOnLoginPage = url.includes('/login') || hasLoginElements;
    expect(isOnLoginPage).toBeTruthy();
  });

});

test.describe('MAGI Chat - Authenticated Tests (Manual)', () => {
  
  // These tests require manual login or a stored auth state
  // They will be skipped in CI or when not authenticated
  
  test.skip('should show chat input after login', async ({ page }) => {
    // This test is skipped - run manually after authenticating
    await page.goto('/');
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test.skip('should display agent responses after sending message', async ({ page }) => {
    // This test is skipped - run manually after authenticating
    await page.goto('/');
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('テスト');
    await chatInput.press('Enter');

    await expect(page.locator('text=MELCHIOR')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=BALTHASAR')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=CASPER')).toBeVisible({ timeout: 5000 });
  });

});

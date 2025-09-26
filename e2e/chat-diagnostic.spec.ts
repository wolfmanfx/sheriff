import { test, expect } from '@playwright/test';

/**
 * Diagnostic test to investigate form submission issues
 * Tests what happens when submitting a message in the chat
 */
test.describe('Chat Form Submission Diagnostic', () => {
  test('should diagnose form submission and page reload issue', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkRequests: Array<{ url: string; method: string; status?: number }> = [];
    let pageReloaded = false;
    let formSubmitted = false;

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
      });
    });

    page.on('response', (response) => {
      const request = networkRequests.find((r) => r.url === response.url());
      if (request) {
        request.status = response.status();
      }
    });

    // Detect page reloads
    page.on('framenavigated', () => {
      if (page.url().includes('/chat')) {
        pageReloaded = true;
      }
    });

    // Navigate to chat page
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.chat-container')).toBeVisible({ timeout: 10000 });

    // Get initial URL to detect reloads
    const initialUrl = page.url();

    // Find form and input
    const form = page.locator('form.chat-form');
    const input = page.locator('input.chat-input').or(page.locator('input[type="text"]')).first();
    const sendButton = page
      .locator('button.send-button')
      .or(page.locator('button[type="submit"]'))
      .first();

    // Monitor form submission
    await form.evaluate((form) => {
      form.addEventListener('submit', (e) => {
        (window as any).__formSubmitted = true;
      });
    });

    // Fill input
    const testMessage = 'Test message for diagnostic';
    await input.fill(testMessage);
    await expect(input).toHaveValue(testMessage);

    // Wait for button to be enabled
    await expect(sendButton).toBeEnabled({ timeout: 2000 });

    // Click send button and wait a bit
    await sendButton.click();
    await page.waitForTimeout(2000);

    // Check if form was submitted
    formSubmitted = await page.evaluate(() => (window as any).__formSubmitted || false);

    // Check if page reloaded
    const currentUrl = page.url();
    if (currentUrl !== initialUrl || pageReloaded) {
      console.log('❌ PAGE RELOADED!');
      console.log('Initial URL:', initialUrl);
      console.log('Current URL:', currentUrl);
    }

    // Wait a bit more to capture any delayed errors
    await page.waitForTimeout(1000);

    // Output diagnostics
    console.log('\n=== DIAGNOSTIC RESULTS ===');
    console.log('Form submitted:', formSubmitted);
    console.log('Page reloaded:', pageReloaded || currentUrl !== initialUrl);
    console.log('\nConsole Errors:', consoleErrors.length);
    consoleErrors.forEach((error) => console.log('  -', error));

    console.log('\nNetwork Requests:', networkRequests.length);
    networkRequests.forEach((req) => {
      console.log(`  ${req.method} ${req.url}${req.status ? ` [${req.status}]` : ''}`);
    });

    // Check for specific issues
    const apiRequest = networkRequests.find((r) => r.url.includes('/api/agent/session'));
    if (!apiRequest) {
      console.log('\n❌ No API request to /api/agent/session found!');
    } else {
      console.log('\n✅ API request found:', apiRequest.method, apiRequest.status);
    }

    // Assertions to fail the test if issues are found
    if (pageReloaded || currentUrl !== initialUrl) {
      throw new Error(
        `Page reloaded unexpectedly! Initial: ${initialUrl}, Current: ${currentUrl}`,
      );
    }

    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console errors detected (test will continue)');
    }

    // The form should have been submitted (via ngSubmit handler)
    expect(formSubmitted).toBeTruthy();
  });

  test('should prevent default form submission behavior', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const form = page.locator('form.chat-form');
    const input = page.locator('input.chat-input').or(page.locator('input[type="text"]')).first();
    const sendButton = page
      .locator('button.send-button')
      .or(page.locator('button[type="submit"]'))
      .first();

    // Intercept form submission
    let formSubmitPrevented = false;
    await form.evaluate((form) => {
      const originalSubmit = form.onsubmit;
      form.onsubmit = (e) => {
        if (!e.defaultPrevented) {
          (window as any).__defaultNotPrevented = true;
        }
        if (originalSubmit) {
          originalSubmit.call(form, e);
        }
      };
    });

    // Fill and submit
    await input.fill('Test');
    await sendButton.click();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Check if default was prevented
    const defaultNotPrevented = await page.evaluate(
      () => (window as any).__defaultNotPrevented || false,
    );

    if (defaultNotPrevented) {
      console.log('❌ Form default submission was NOT prevented!');
      throw new Error('Form submission default behavior was not prevented');
    }

    console.log('✅ Form submission default behavior was prevented');
  });
});


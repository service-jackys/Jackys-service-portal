import { expect, test } from '@playwright/test';

test.describe('service portal public journey', () => {
  test('renders the service request entry point', async ({ page }) => {
    await page.goto('/portal/');

    await expect(page).toHaveTitle("Jacky's Service Portal");
    await expect(page.getByRole('heading', { name: 'Register a service complaint' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit service request' })).toBeVisible();
  });

  test('shows required-field feedback without sending incomplete data', async ({ page }) => {
    let requestCount = 0;
    await page.route('**/api/public/complaints', async (route) => {
      requestCount += 1;
      await route.continue();
    });
    await page.goto('/portal/');
    await page.getByRole('button', { name: 'Submit service request' }).click();

    await expect(page.locator('[data-error-for="customerType"]')).toHaveText(
      'Select a customer type.',
    );
    await expect(page.locator('[data-error-for="customerName"]')).toHaveText(
      'Enter the customer name.',
    );
    await expect(page.locator('[data-error-for="contactNumber"]')).toHaveText(
      'Enter a contact number.',
    );
    await expect(page.locator('[data-error-for="description"]')).toHaveText('Describe the issue.');
    expect(requestCount).toBe(0);
  });
});

test.describe('staff access boundary', () => {
  test('keeps the protected workspace behind sign in', async ({ page }) => {
    const response = await page.request.get('/api/complaints');
    expect(response.status()).toBe(401);

    await page.goto('/portal/');
    await expect(page.getByRole('heading', { name: 'Staff workspace' })).toBeVisible();
    await expect(page.locator('#staff-workspace')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'First-time setup' })).toBeVisible();
  });
});

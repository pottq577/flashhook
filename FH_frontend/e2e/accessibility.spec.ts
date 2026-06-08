import fs from 'fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    fs.writeFileSync('axe-violations.json', JSON.stringify(accessibilityScanResults.violations, null, 2));

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

import path from 'path';
import fs from 'fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    const resultsDir = path.join('e2e', 'test-results');
    if (!fs.existsSync(resultsDir)) {
      await fs.promises.mkdir(resultsDir, { recursive: true });
    }
    const outputPath = path.join(resultsDir, `axe-violations-${Date.now()}.json`);
    await fs.promises.writeFile(outputPath, JSON.stringify(accessibilityScanResults.violations, null, 2));

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

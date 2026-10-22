import { test, expect } from '@playwright/test';
import { button, demo } from './helpers';

const routes = ['/', '/competitive', '/settings', '/teams', '/guides', '/library'];

test('no screen scrolls sideways at any tested width', async ({ page }) => {
  await demo(page);
  for (const route of routes) {
    await page.goto(route);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${route} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test('Competitive opens in the studio on wide screens only', async ({
  page,
}, info) => {
  await demo(page, '/import-showdown');
  await page.getByRole('textbox', { name: 'Team name', exact: true }).fill('Duo');
  await page
    .getByRole('textbox', { name: 'Showdown export' })
    .fill('Garchomp @ Choice Scarf\nAbility: Rough Skin\nLevel: 50\n- Earthquake');
  await button(page, 'Import team').click();
  await page.goto('/competitive');
  const preview = page.getByTestId('studio');
  const wide = (page.viewportSize()?.width ?? 0) >= 1100;
  if (wide) await expect(preview).toBeVisible();
  else await expect(preview).toHaveCount(0);
  info.annotations.push({ type: 'width', description: String(page.viewportSize()?.width) });
});

test('buttons keep their natural width on desktop settings', async ({ page }) => {
  await demo(page, '/settings');
  const width = page.viewportSize()?.width ?? 0;
  test.skip(width < 700, 'phones stretch buttons by design');
  const box = await page.getByRole('button', { name: 'App backup', exact: true }).boundingBox();
  expect(box!.width).toBeLessThan(400);
});

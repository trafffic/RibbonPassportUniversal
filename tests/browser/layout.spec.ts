import { test, expect } from '@playwright/test';
import { demo } from './helpers';

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

test('Competitive shows a build preview beside the box on wide screens only', async ({
  page,
}, info) => {
  await demo(page, '/competitive');
  const preview = page.getByText('BUILD PREVIEW');
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

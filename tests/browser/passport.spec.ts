import { test, expect } from '@playwright/test';
import { demo } from './helpers';
const passport = '/passport/sample-collection-v1-pokemon-4';
test('owned ribbons show an unframed description on desktop hover or mobile tap', async ({
  page,
}) => {
  await demo(page, passport);
  const icon = page
    .getByLabel(/^Details for /)
    .filter({ visible: true })
    .first();
  await expect(icon).toBeVisible();
  const desktop = (page.viewportSize()?.width ?? 0) >= 1100;
  if (desktop) {
    await icon.dispatchEvent('click');
    await expect(page.getByLabel('Ribbon description')).toHaveCount(0);
    await icon.hover();
  } else await icon.click();
  const bubble = page.getByLabel('Ribbon description');
  await expect(bubble).toBeVisible();
  const a = (await icon.boundingBox())!,
    b = (await bubble.boundingBox())!,
    view = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(view.width);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(view.height);
  expect(await bubble.evaluate(el => [...el.querySelectorAll('*')].some(child =>
    ['auto', 'scroll'].includes(getComputedStyle(child).overflowY),
  ))).toBe(false);
  expect(b.y + b.height <= a.y + 1 || b.y >= a.y + a.height - 1).toBe(true);
  if (desktop) await page.mouse.move(0, 0);
  else await icon.click();
  await expect(bubble).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
import { demo } from './helpers';
const passport = '/passport/sample-collection-v1-pokemon-4';
test('ribbon description bubble is anchored to the tapped icon', async ({
  page,
}) => {
  await demo(page, passport);
  const icon = page
    .getByRole('button', { name: /^Details for / })
    .filter({ visible: true })
    .first();
  await expect(icon).toBeVisible();
  await icon.click();
  const bubble = page.getByLabel('Ribbon description');
  await expect(bubble).toBeVisible();
  const a = (await icon.boundingBox())!,
    b = (await bubble.boundingBox())!,
    view = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(view.width);
  expect(b.y + b.height <= a.y + 1 || b.y >= a.y + a.height - 1).toBe(true);
  await icon.click();
  await expect(bubble).toHaveCount(0);
});

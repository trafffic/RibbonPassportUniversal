import { test, expect } from '@playwright/test';
import { button, demo, mainTab, passportTab, offline } from './helpers';

test('short passport links survive refresh, browser Back and offline reload', async ({ page, context }) => {
  await demo(page);
  await button(page, 'Select Gardevoir').click();
  await button(page, page.viewportSize()!.width >= 980 ? 'Open passport preview' : 'Open passport').click();
  await expect(page).toHaveURL(/\/passport\/[a-z0-9]{7}$/);
  const link = page.url();
  await expect(passportTab(page, 'Overview')).toBeVisible();
  await expect(page.getByText('Gardevoir', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.reload();
  await expect(passportTab(page, 'Overview')).toBeVisible();
  await expect(page).toHaveURL(link);
  await mainTab(page, 'Settings').click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goBack();
  await expect(page).toHaveURL(link);
  await expect(page.getByText('Gardevoir', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await mainTab(page, 'Ribbons').click();
  await button(page, 'Select Sparky').click();
  await page.goto(link);
  await expect(page.getByText('Gardevoir', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await offline(page);
  await context.setOffline(true);
  await page.reload();
  await expect(passportTab(page, 'Overview')).toBeVisible();
  await expect(page.getByText('Gardevoir', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('existing full-ID links open the same Pokémon and requested section with a short URL', async ({ page }) => {
  await demo(page, '/passport/sample-collection-v1-pokemon-4?tab=ribbons');
  await expect(page).toHaveURL(/\/passport\/[a-z0-9]{7}\?tab=ribbons$/);
  await expect(passportTab(page, 'Ribbons')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'GARDEVOIR', exact: true })).toBeVisible();
  const shortPath = new URL(page.url()).pathname;
  await page.goto('/passport/sample-collection-v1-pokemon-4?tab=overview');
  await expect(page).toHaveURL(new URL(shortPath, page.url()).href);
  await expect(page.getByText('Gardevoir', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

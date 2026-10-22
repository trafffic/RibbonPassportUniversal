import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { button, demo, options } from './helpers';
test('fresh install shows the ribbon empty state; Try demo fills it and Refresh demo is undoable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Start your ribbon journey')).toBeVisible();
  await expect(button(page, 'Add Pokémon')).toBeVisible();
  await expect(button(page, 'Import ribbons.guide backup')).toBeVisible();
  await expect(button(page, 'Select Sparky')).toHaveCount(0);
  await demo(page);
  await expect(page.getByText('Start your ribbon journey')).toHaveCount(0);
  await page.reload();
  await expect(button(page, 'Select Sparky')).toBeVisible();
  await button(page, 'Collection options').click();
  await expect(button(page, 'Try demo')).toHaveCount(0);
  await button(page, 'Refresh demo').click();
  await button(page, 'Refresh demo Pokémon').click();
  await expect(button(page, 'Select Sparky')).toBeVisible();
  await expect(
    page.getByText('Demo Pokémon ready. You can undo this change.').first(),
  ).toBeVisible();
});
test('competitive empty state offers Add Pokémon, Showdown import and the team library', async ({
  page,
}) => {
  await page.goto('/competitive');
  await expect(page.getByText('Build your first team')).toBeVisible();
  await expect(button(page, 'Import Showdown team')).toBeVisible();
  await button(page, 'Browse community teams').click();
  await expect(page).toHaveURL(/library/);
  await page.goBack();
  await button(page, 'Add Pokémon').click();
  await expect(page.getByRole('textbox').first()).toBeVisible();
});
test('party visibility persists per section and Export Ribbon Masters downloads', async ({
  page,
}) => {
  await demo(page);
  await button(page, 'Party').click();
  await page.reload();
  await expect(button(page, 'Empty party slot 1')).toBeVisible();
  const wait = page.waitForEvent('download');
  await options(page, 'Export Ribbon Masters');
  const file = await (await wait).path();
  const guide = JSON.parse(await fs.readFile(file!, 'utf8'));
  expect(guide.fileVersion).toBe(5);
  expect(guide.pokemon).toHaveLength(6);
  expect(guide.pokemon.some((p: any) => p.showdownSet)).toBe(false);
});

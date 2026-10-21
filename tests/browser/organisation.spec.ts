import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

async function importText(page: Page, text: string) {
  await page.getByRole('button', { name: 'Import / export', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await chooser).setFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
}
async function add(page: Page, species: string, choice: string, nickname: string) {
  await page.getByRole('button', { name: '+ Add Pokémon', exact: true }).click();
  await page.getByRole('button', { name: /^Species \/ form:/ }).click();
  await page.getByRole('textbox', { name: 'Search species / form', exact: true }).fill(species);
  await page.getByRole('button', { name: `Choose ${choice}`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill(nickname);
  await page.getByRole('textbox', { name: 'Level', exact: true }).fill('100');
  await page.getByRole('textbox', { name: 'Met level', exact: true }).fill('50');
  await page.getByRole('button', { name: /^Origin game:/ }).click();
  await page.getByRole('textbox', { name: 'Search origin game', exact: true }).fill('Alpha Sapphire');
  await expect(page.getByRole('button', { name: 'Choose Omega Ruby/Alpha Sapphire', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose Alpha Sapphire', exact: true }).click();
  await page.getByRole('button', { name: /^Current game:/ }).click();
  await page.getByRole('textbox', { name: 'Search current game', exact: true }).fill('Alpha Sapphire');
  await page.getByRole('button', { name: 'Choose Alpha Sapphire', exact: true }).click();
  await page.getByRole('button', { name: 'Add to box', exact: true }).click();
  await expect(page.getByRole('button', { name: `Select ${nickname}`, exact: true })).toBeVisible();
}
test('build a collection, edit, swap/move/undo, restore offline and round-trip the original format', async ({ page, context }, info) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await importText(page, '{"fileVersion":5,"boxes":["Home"],"pokemon":[],"future":{"keep":true}}');
  await add(page, 'metagross', '#0376 Metagross', 'Atlas');
  await add(page, 'gardevoir', '#0282 Gardevoir', 'Sage');
  await add(page, 'rayquaza', '#0384 Rayquaza', 'Sky');
  await page.getByRole('button', { name: '+ Create box', exact: true }).click();
  await page.getByRole('textbox', { name: 'Box name', exact: true }).fill('Ribbon masters');
  await page.getByRole('button', { name: 'Create box', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Select Atlas', exact: true }).click();
  await page.getByRole('button', { name: 'Move Pokémon', exact: true }).click();
  await page.getByRole('button', { name: 'Swap with Sage 2', exact: true }).click();
  await expect(page.getByTestId('pc-slot-2')).toHaveAttribute('aria-label', 'Select Atlas');
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute('aria-label', 'Select Atlas');
  await page.getByRole('button', { name: 'Move Pokémon', exact: true }).click();
  await page.getByRole('button', { name: 'Ribbon masters', exact: true }).click();
  await page.getByRole('button', { name: 'Move to empty slot 30', exact: true }).click();
  await page.getByRole('button', { name: 'Box settings', exact: true }).click();
  for (const preview of await page.getByRole('button', { name: /^Wallpaper / }).all()) {
    const bounds = await preview.boundingBox();
    expect(bounds && bounds.height <= bounds.width * 1.8).toBe(true);
  }
  await page.getByRole('textbox', { name: 'Box name', exact: true }).fill('Travellers');
  await page.getByRole('button', { name: 'Wallpaper Beach', exact: true }).click();
  await page.getByRole('button', { name: 'Save box', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Pokémon', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('Atlas Prime');
  await page.getByRole('button', { name: 'Shiny: off', exact: true }).click();
  await page.getByRole('textbox', { name: 'Size (0–255)', exact: true }).fill('255');
  await page.getByRole('button', { name: 'Save Pokémon', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select Atlas Prime', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find Pokémon', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search Pokémon', exact: true }).fill('Sage');
  await page.getByRole('button', { name: 'Find Sage', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search Pokémon', exact: true }).fill('');
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
  await page.getByRole('button', { name: 'Travellers', exact: true }).click();
  await page.getByRole('button', { name: 'Select Atlas Prime', exact: true }).click();
  await expect(page.getByText('Atlas Prime', { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Every ribbon has a story.' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('slice-two-collection.png'), fullPage: true });
  // Both dimensions of each image must remain inside the selected box slot.
  for (const slot of await page.locator('[data-testid^="pc-slot-"]').all()) {
    const outer = await slot.boundingBox();
    for (const img of await slot.locator('img').all()) {
      const inner = await img.boundingBox();
      expect(outer && inner && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'Open full passport →', exact: true }).click();
  await page.getByRole('button', { name: 'Plan next ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Alpha Sapphire', exact: true }).click();
  await page.getByRole('button', { name: 'Record Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByText('Alert Ribbon', { exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByText('Alert Ribbon', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import / export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export original format', exact: true }).click();
  const text = await fs.readFile((await (await download).path())!, 'utf8'), exported = JSON.parse(text);
  expect(exported.future.keep).toBe(true); expect(exported.pokemon).toHaveLength(3);
  expect(exported.pokemon[0].earnedGames['alert-ribbon']).toBe('as');
  expect(exported.ribbonPassportLayout.boxes[1].slots[29]).toBe(exported.ribbonPassportLayout.recordIDs[0]);
  await page.getByRole('button', { name: 'Close backups', exact: true }).click();
  await importText(page, text);
  await page.getByRole('button', { name: 'Travellers', exact: true }).click();
  await expect(page.getByTestId('pc-slot-30')).toHaveAttribute('aria-label', 'Select Atlas Prime');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});
test('a new empty collection is reviewable and undo restores the previous collection after reopening', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start a new collection', exact: true }).click();
  await expect(page.getByText(/current collection of 6 Pokémon/)).toBeVisible();
  await page.getByRole('button', { name: 'Create empty collection', exact: true }).click();
  await expect(page.getByText('Your next story starts here', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select Sparky', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select Sparky', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Select Sparky', exact: true })).toBeVisible();
});

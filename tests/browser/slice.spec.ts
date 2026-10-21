import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

test('PC selection, passport, ribbon record/undo, Journey, offline reopen and export', async ({ page, context }, info) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Select Sparky' })).toBeVisible();
  await expect(page.getByText('QUICK PREVIEW', { exact: true })).toBeVisible();
  // Check the original sample silhouettes in the real rectangular PC slots.
  // A width-only bound missed tall-sprite clipping in the earlier layout.
  for (let i = 1; i <= 6; i++) {
    const slot = page.getByTestId(`pc-slot-${i}`);
    const outer = (await slot.boundingBox())!;
    const images = slot.locator('img');
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      const inner = (await image.boundingBox())!;
      expect(inner.x).toBeGreaterThanOrEqual(outer.x);
      expect(inner.y).toBeGreaterThanOrEqual(outer.y);
      expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width);
      expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height);
    }
  }
  for (const button of await page.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds && bounds.x >= -1 && bounds.x + bounds.width <= page.viewportSize()!.width + 1).toBe(true);
  }
  await page.getByRole('button', { name: '+ Create box', exact: true }).click();
  await page.getByRole('button', { name: 'Create box', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Box 02', exact: true })).toBeVisible();
  await expect(page.getByText('0 / 30', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Box 01', exact: true }).click();
  await page.getByRole('button', { name: 'Select Gardevoir' }).click();
  await expect(page.getByText('10 awards', { exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'Every ribbon has a story.' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('collection.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open full passport →' }).click();
  await page.getByRole('button', { name: 'Plan next ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Record Alert Ribbon', exact: true }).isDisabled().then(disabled => expect(disabled).toBe(true));
  await page.getByRole('button', { name: 'Alpha Sapphire', exact: true }).click();
  await page.getByRole('button', { name: 'Record Alert Ribbon', exact: true }).click();
  await expect(page.getByText('Ribbon recorded. Saved on this device.', { exact: true }).filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Owned awards', exact: true }).click();
  await page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true }).click();
  await expect(page.getByText('Earned in: Alpha Sapphire', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('passport.png'), fullPage: true });
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Plan next ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Alpha Sapphire', exact: true }).click();
  await page.getByRole('button', { name: 'Record Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByText('Alert Ribbon', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('journey.png'), fullPage: true });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Journey', exact: true }).click();
  await expect(page.getByText('Alert Ribbon', { exact: true })).toBeVisible();
  await expect(page.getByText('The journey so far', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import / export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export collection', exact: true }).click();
  const file = await download;
  const exported = JSON.parse(await fs.readFile((await file.path())!, 'utf8'));
  expect(exported.format).toBe('ribbon-passport-universal');
  const gardevoir = exported.collection.records.find((r: any) => r.pokemon.species === 'gardevoir');
  expect(gardevoir.pokemon.earnedGames['alert-ribbon']).toBe('as');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test('failed local save keeps ownership unchanged and survives reload', async ({ page }) => {
  await page.goto('/passport/sample-collection-v1-pokemon-4');
  await page.getByRole('button', { name: 'Plan next ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true }).click();
  await page.getByRole('button', { name: 'Alpha Sapphire', exact: true }).click();
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    (window as any).restoreTransactions = () => { IDBDatabase.prototype.transaction = original; };
    IDBDatabase.prototype.transaction = function(this: IDBDatabase, ...args: any[]) {
      if (args[1] === 'readwrite') throw new DOMException('Test storage quota exceeded', 'QuotaExceededError');
      return original.apply(this, args as any);
    } as typeof original;
  });
  await page.getByRole('button', { name: 'Record Alert Ribbon', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Test storage quota exceeded');
  await page.getByRole('button', { name: 'Owned awards', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).restoreTransactions());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Details for Alert Ribbon', exact: true })).toHaveCount(0);
  await expect(page.getByText('10 AWARDS OWNED', { exact: true })).toBeVisible();
});

test('conflicting offline windows preserve both copies and ask again after reopening', async ({ page, context }) => {
  const record = async (tab: typeof page, name: string) => {
    await tab.getByRole('button', { name: 'Plan next ribbon', exact: true }).click();
    await tab.getByRole('button', { name: `Details for ${name}`, exact: true }).click();
    await tab.getByRole('button', { name: 'Alpha Sapphire', exact: true }).click();
    await tab.getByRole('button', { name: `Record ${name}`, exact: true }).click();
  };
  await page.goto('/passport/sample-collection-v1-pokemon-4');
  const other = await context.newPage();
  await other.goto('/passport/sample-collection-v1-pokemon-4');
  await expect(other.getByRole('button', { name: 'Owned awards', exact: true })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await record(page, 'Alert Ribbon');
  await expect(page.getByText('Ribbon recorded. Saved on this device.', { exact: true }).filter({ visible: true })).toBeVisible();
  await record(other, 'Shock Ribbon');
  await expect(other.getByText('Choose a saved version', { exact: true })).toBeVisible();
  await other.reload();
  await expect(other.getByText('Choose a saved version', { exact: true })).toBeVisible();
  await other.getByRole('button', { name: 'Import / export', exact: true }).click();
  for (const label of ['Export this window’s version', 'Export other window’s version']) {
    const download = other.waitForEvent('download');
    await other.getByRole('button', { name: label, exact: true }).click();
    const exported = JSON.parse(await fs.readFile((await (await download).path())!, 'utf8'));
    const p = exported.collection.records.find((r: any) => r.pokemon.species === 'gardevoir').pokemon;
    expect(p.ribbons.includes(label.includes('this') ? 'shock-ribbon' : 'alert-ribbon')).toBe(true);
  }
  await other.getByRole('button', { name: 'Keep this window’s version', exact: true }).click();
  await expect(other.getByText('Choose a saved version', { exact: true })).toHaveCount(0);
  await expect(other.getByRole('button', { name: 'Details for Shock Ribbon', exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: 'Details for Alert Ribbon', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Details for Shock Ribbon', exact: true })).toBeVisible();
});

test('native backup import preview, source export preservation, and malformed import rejection', async ({ page }, info) => {
  // Import from an open passport; a replacement must navigate to its new collection.
  await page.goto('/passport/sample-collection-v1-pokemon-4');
  await page.getByRole('button', { name: 'Import / export', exact: true }).click();
  const original = '{"format":"ribbon-passport","version":1,"futureRoot":9123372036854000123,"collection":{"pokemon":[{"id":"imported-uuid","species":"metagross","nickname":"Archive","shiny":false,"currentgame":"bd","origingame":"emerald","currentlevel":100,"ribbons":[],"journal":[{"photo":"data:image/png;base64,AA=="}],"futureField":{"keep":true}}],"teams":[],"selectedID":"imported-uuid","updatedAt":812345678.123456}}';
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await chooser).setFiles({ name: 'app.json', mimeType: 'application/json', buffer: Buffer.from(original) });
  await expect(page.getByText('1 Pokémon · 1 boxes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select Archive', exact: true })).toBeVisible();
  await expect(page).toHaveURL('http://127.0.0.1:8081/');
  await page.getByRole('button', { name: 'Import / export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export original format', exact: true }).click();
  expect(await fs.readFile((await (await download).path())!, 'utf8')).toBe(original);
  const badChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose backup file', exact: true }).click();
  await (await badChooser).setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"fileVersion":42,"pokemon":[]}') });
  await expect(page.getByRole('alert')).toContainText('Only ribbons.guide fileVersion 5');
  await expect(page.getByRole('button', { name: 'Select Archive', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('import.png'), fullPage: true });
});

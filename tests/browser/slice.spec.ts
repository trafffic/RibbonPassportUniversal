import { test, expect } from '@playwright/test';
import {
  button,
  mainTab,
  passportTab,
  record,
  offline,
  backups,
  download,
  importText,
  options,
  demo,
} from './helpers';
const passport = '/passport/sample-collection-v1-pokemon-4';
test('Classic PC opens the same Pokémon in Passport Studio; record, undo, Journey, offline restore and export', async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await demo(page);
  await expect(button(page, 'Select Sparky')).toBeVisible();
  for (let i = 1; i <= 6; i++) {
    const slot = page.getByTestId('pc-slot-' + i),
      outer = (await slot.boundingBox())!;
    for (const img of await slot.locator('img').all()) {
      await expect
        .poll(() =>
          img.evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const inner = (await img.boundingBox())!;
      expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
      expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
      expect(inner.x + inner.width).toBeLessThanOrEqual(
        outer.x + outer.width + 1,
      );
      expect(inner.y + inner.height).toBeLessThanOrEqual(
        outer.y + outer.height + 1,
      );
    }
  }
  await button(page, 'Select Gardevoir').click();
  await page.screenshot({
    path: info.outputPath('classic-pc.png'),
    fullPage: true,
  });
  const width = page.viewportSize()!.width;
  if (width >= 1100) {
    // The desktop studio shows the selected Pokémon's passport in place.
    await expect(page.getByTestId('studio')).toBeVisible();
  } else {
    await button(
      page,
      width >= 980 ? 'Open passport preview' : 'Open passport',
    ).click();
    await expect(page).toHaveURL(new RegExp(passport));
  }
  await record(page, 'Alert Ribbon');
  await expect(
    page
      .getByText('Ribbon recorded.', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await button(page, 'Undo last change').click();
  await expect(
    page
      .getByText('Change undone.', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await record(page, 'Alert Ribbon');
  await passportTab(page, 'Journey').click();
  await expect(
    page.getByText('Stamp album', { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('passport-studio.png'),
    fullPage: true,
  });
  await offline(page);
  await context.setOffline(true);
  await page.reload();
  await passportTab(page, 'Journey').click();
  await expect(
    page.getByText('Stamp album', { exact: true }).first(),
  ).toBeVisible();
  await backups(page);
  const data = JSON.parse(await download(page, 'Export collection'));
  const p = data.collection.records.find(
    (r: any) => r.pokemon.species === 'gardevoir',
  ).pokemon;
  expect(p.earnedGames['alert-ribbon']).toBe('as');
  expect(p.visits.some((v: any) => v.game === 'as')).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});
test('quota failure leaves ownership unchanged after reopening', async ({
  page,
}) => {
  await demo(page, passport);
  await passportTab(page, 'Ribbons').click();
  await button(page, 'Details for Alert Ribbon').click();
  await button(page, 'Alpha Sapphire').click();
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (
      this: IDBDatabase,
      ...args: any[]
    ) {
      if (args[1] === 'readwrite')
        throw new DOMException(
          'Test storage quota exceeded',
          'QuotaExceededError',
        );
      return original.apply(this, args as any);
    } as typeof original;
  });
  await button(page, 'Record Alert Ribbon').click();
  await expect(
    page.getByRole('alert').filter({ visible: true }).last(),
  ).toContainText('Test storage quota exceeded');
  await page.reload();
  await backups(page);
  const c = JSON.parse(await download(page, 'Export collection')).collection;
  expect(
    c.records.find((r: any) => r.pokemon.species === 'gardevoir').pokemon
      .ribbons,
  ).not.toContain('alert-ribbon');
});
test('offline conflicts preserve both branches and remain unresolved after reopening', async ({
  page,
  context,
}) => {
  await demo(page, passport);
  await expect(passportTab(page, 'Ribbons')).toBeVisible();
  const other = await context.newPage();
  await other.goto(passport);
  await expect(passportTab(other, 'Ribbons')).toBeVisible();
  await offline(page);
  await context.setOffline(true);
  await record(page, 'Alert Ribbon');
  await record(other, 'Shock Ribbon');
  await expect(
    other.getByText('Choose a saved version', { exact: true }),
  ).toBeVisible();
  await other.reload();
  await expect(
    other.getByText('Choose a saved version', { exact: true }),
  ).toBeVisible();
  for (const label of [
    'Export this window’s version',
    'Export other window’s version',
  ]) {
    const c = JSON.parse(await download(other, label)).collection;
    expect(
      c.records.find((r: any) => r.pokemon.species === 'gardevoir').pokemon
        .ribbons,
    ).toContain(label.includes('this') ? 'shock-ribbon' : 'alert-ribbon');
  }
  await button(other, 'Keep this window’s version').click();
  await expect(
    other.getByText('Choose a saved version', { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await backups(page);
  const c = JSON.parse(await download(page, 'Export collection')).collection;
  expect(
    c.records.find((r: any) => r.pokemon.species === 'gardevoir').pokemon
      .ribbons,
  ).toContain('shock-ribbon');
});
test('import preview preserves native source bytes and rejects malformed backups', async ({
  page,
}, info) => {
  await page.goto('/');
  await backups(page);
  const original =
    '{"format":"ribbon-passport","version":1,"futureRoot":9123372036854000123,"collection":{"pokemon":[{"id":"imported-uuid","species":"metagross","nickname":"Archive","currentgame":"bd","origingame":"emerald","currentlevel":100,"ribbons":[],"journal":[{"photo":"data:image/png;base64,AA=="}],"futureField":{"keep":true}}],"teams":[],"selectedID":"imported-uuid"}}';
  await importText(page, original);
  await expect(button(page, 'Select Archive')).toBeVisible();
  await backups(page);
  expect(await download(page, 'Export original format')).toBe(original);
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choose backup file').click();
  await (
    await chooser
  ).setFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"fileVersion":42,"pokemon":[]}'),
  });
  await expect(
    page.getByRole('alert').filter({ visible: true }).last(),
  ).toContainText('Only ribbons.guide fileVersion 5');
  await page.screenshot({
    path: info.outputPath('import-rejection.png'),
    fullPage: true,
  });
});

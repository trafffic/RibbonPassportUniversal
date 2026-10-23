import { test, expect } from '@playwright/test';
import { backups, button, importText, passportTab, demo } from './helpers';
import { createRequire } from 'node:module';
const passport = '/passport/sample-collection-v1-pokemon-4';
const unknownGame = JSON.stringify({
  format: 'ribbon-passport',
  version: 1,
  collection: {
    pokemon: [
      {
        id: 'p1',
        species: 'metagross',
        ribbons: ['effort-ribbon'],
        currentgame: 'bd',
        origingame: 'emerald',
        currentlevel: 100,
        shiny: false,
        metLevel: 50,
        earnedGenerations: { 'effort-ribbon': 8 },
        visits: [
          { id: 'v1', game: 'emerald' },
          { id: 'v2', game: 'bd' },
        ],
      },
    ],
    teams: [],
    selectedID: 'p1',
  },
});
test('ribbon page size cycles 12, 24, 6 like the iPhone app and persists after reload', async ({
  page,
}) => {
  await demo(page, passport);
  await passportTab(page, 'Ribbons').click();
  await expect(button(page, '12 ribbons per page. Change to 24')).toBeVisible();
  await button(page, '12 ribbons per page. Change to 24').click();
  await button(page, '24 ribbons per page. Change to 6').click();
  await expect(button(page, '6 ribbons per page. Change to 12')).toBeVisible();
  await page.reload();
  await passportTab(page, 'Ribbons').click();
  await expect(button(page, '6 ribbons per page. Change to 12')).toBeVisible();
  await button(page, '6 ribbons per page. Change to 12').click();
  await page.reload();
  await passportTab(page, 'Ribbons').click();
  await expect(button(page, '12 ribbons per page. Change to 24')).toBeVisible();
});
test('Set game assigns an unknown earning game from the same generation and can be undone', async ({
  page,
}) => {
  await page.goto('/');
  await backups(page);
  await importText(page, unknownGame);
  await page.goto('/passport/p1');
  await passportTab(page, 'Ribbons').click();
  await button(page, 'Owned (1)').click();
  await button(page, 'Details for Effort Ribbon').click();
  await expect(page.getByText('Gen 8 · Game not set').first()).toBeVisible();
  await button(page, 'Set game Brilliant Diamond').click();
  await expect(page.getByText('Earning game saved.').first()).toBeVisible();
  await button(page, 'Owned (1)').click();
  await button(page, 'Details for Effort Ribbon').click();
  await expect(page.getByText('Earned in: Brilliant Diamond')).toBeVisible();
  await expect(button(page, 'Set game Brilliant Diamond')).toHaveCount(0);
});
test('a ribbon tile records and removes in one tap, and undo restores it', async ({
  page,
}) => {
  await demo(page, passport);
  await passportTab(page, 'Ribbons').click();
  const quick = page
    .getByRole('button', { name: /^Record .+ in .+/ })
    .filter({ visible: true })
    .first();
  await expect(quick).toBeVisible();
  await quick.click();
  await expect(
    page.getByText('Ribbon recorded.', { exact: true }).first(),
  ).toBeVisible();
  await expect(button(page, 'Owned (11)')).toBeVisible();
  await button(page, 'Undo last change').click();
  await expect(
    page.getByText('Change undone.', { exact: true }).first(),
  ).toBeVisible();
  await expect(button(page, 'Owned (10)')).toBeVisible();
});
test('species without bundled art load their sprite, falling back through the sources', async ({
  page,
}) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  const tried: string[] = [];
  await page.route('https://raw.githubusercontent.com/**', (route) => {
    tried.push(route.request().url());
    return route.fulfill({ status: 404, body: 'missing' });
  });
  await page.route('https://play.pokemonshowdown.com/**', (route) => {
    tried.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: png,
    });
  });
  await page.goto('/');
  await backups(page);
  await importText(page, unknownGame.replace('metagross', 'bulbasaur'));
  await page.goto('/passport/p1');
  await expect(
    page.getByRole('img', { name: 'Bulbasaur' }).first(),
  ).toBeVisible();
  await expect.poll(() => tried[0]).toContain('pokesprite');
  await expect
    .poll(() => tried.some((u) => u.includes('pokemonshowdown.com')))
    .toBe(true);
});
test('Escape closes the topmost sheet', async ({ page }) => {
  await demo(page, passport);
  await passportTab(page, 'Ribbons').click();
  await button(page, 'Browse game').click();
  await expect(button(page, 'Cancel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(button(page, 'Cancel')).toHaveCount(0);
});

test('downloaded sprites trim padding, retain wide silhouettes and cache offline', async ({
  page,
  context,
}) => {
  const { PNG } = createRequire(process.cwd() + '/package.json')('pngjs');
  const image = new PNG({ width: 96, height: 96 });
  // Deliberately padded and wide: both edge pixels must survive normalization.
  for (let y = 30; y < 50; y++)
    for (let x = 8; x < 88; x++) {
      const offset = (y * 96 + x) * 4;
      image.data[offset] = 255;
      image.data[offset + 3] = 255;
    }
  await page.route('https://raw.githubusercontent.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: PNG.sync.write(image),
    }),
  );
  await page.goto('/');
  await backups(page);
  await importText(page, unknownGame.replace('metagross', 'bulbasaur'));
  await page.goto('/passport/p1');
  const sprite = page.locator('img[alt="Bulbasaur"]').first();
  await expect(sprite).toBeVisible();
  await expect
    .poll(() =>
      sprite.evaluate((img: HTMLImageElement) => [
        img.naturalWidth,
        img.naturalHeight,
      ]),
    )
    .toEqual([640, 160]);
  await page.screenshot({
    path: `test-results/sprite-sizing-${test.info().project.name}.png`,
  });
  // The normalized bytes must be persisted, not only held in the live promise map.
  await context.setOffline(true);
  // Check persistent image bytes directly: document navigation depends on SW activation.
  expect(
    await page.evaluate(async () => {
      const cache = await caches.open('rp-sprites-trimmed-v1');
      const keys = await cache.keys();
      const response = await cache.match(keys[0]!);
      const bitmap = await createImageBitmap(await response!.blob());
      const dimensions = [bitmap.width, bitmap.height];
      bitmap.close();
      return dimensions;
    }),
  ).toEqual([640, 160]);
});

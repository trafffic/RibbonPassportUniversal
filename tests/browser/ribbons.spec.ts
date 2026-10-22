import { test, expect } from '@playwright/test';
import { backups, button, importText, passportTab, demo } from './helpers';
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
  await button(page, 'Owned · 1 ▴').click();
  await button(page, 'Details for Effort Ribbon').click();
  await expect(page.getByText('Gen 8 · Game not set').first()).toBeVisible();
  await button(page, 'Set game Brilliant Diamond').click();
  await expect(
    page.getByText('Earning game saved. Saved on this device.').first(),
  ).toBeVisible();
  await button(page, 'Owned · 1 ▴').click();
  await button(page, 'Details for Effort Ribbon').click();
  await expect(page.getByText('Earned in: Brilliant Diamond')).toBeVisible();
  await expect(button(page, 'Set game Brilliant Diamond')).toHaveCount(0);
});

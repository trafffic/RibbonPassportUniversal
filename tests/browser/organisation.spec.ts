import { test, expect } from '@playwright/test';
import {
  button,
  mainTab,
  options,
  backups,
  download,
  importText,
  offline,
} from './helpers';
test('box menus rename, wallpaper, move/swap, party and undo persist correctly', async ({
  page,
  context,
}, info) => {
  await page.goto('/');
  await options(page, 'New box');
  await expect(button(page, 'Box 02')).toBeVisible();
  await button(page, 'Box options').click();
  await button(page, 'Rename box').click();
  await page
    .getByRole('textbox', { name: 'Box name', exact: true })
    .fill('Travellers');
  await button(page, 'Wallpaper Beach').click();
  await button(page, 'Save box').click();
  await button(page, 'Box 01').click();
  await button(page, 'Select Sparky').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Move').click();
  await button(page, 'Travellers').click();
  await button(page, 'Move to empty slot 30').click();
  await expect(page.getByTestId('pc-slot-30')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await button(page, 'Undo last change').click();
  await button(page, 'Box 01').click();
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await button(page, 'Pokémon actions').click();
  await button(page, 'Add to party').click();
  await expect(button(page, 'Select Sparky in party')).toBeVisible();
  await offline(page);
  await context.setOffline(true);
  await page.reload();
  await backups(page);
  const c = JSON.parse(await download(page, 'Export collection')).collection;
  expect(c.partyIDs).toContain('sample-collection-v1-pokemon-0');
  expect(
    c.boxes.find((b: any) => b.name === 'Travellers').wallpaper.sunMoon,
  ).toBe('sm09');
  await page.screenshot({
    path: info.outputPath('box-export.png'),
    fullPage: true,
  });
});
test('create empty collection, add and edit Pokémon, then recover the earlier version', async ({
  page,
}) => {
  await page.goto('/');
  await options(page, 'Start a new collection');
  await button(page, 'Create empty collection').click();
  await expect(button(page, 'Select Sparky')).toHaveCount(0);
  await button(page, 'Undo last change').click();
  await expect(button(page, 'Select Sparky')).toBeVisible();
  await options(page, 'Add Pokémon');
  await page.getByRole('button', { name: /^Species \/ form:/ }).click();
  await page
    .getByRole('textbox', { name: 'Search species / form', exact: true })
    .fill('metagross');
  await button(page, 'Choose #0376 Metagross').click();
  await page
    .getByRole('textbox', { name: 'Nickname', exact: true })
    .fill('Atlas');
  await button(page, 'Add to box').click();
  await expect(button(page, 'Select Atlas')).toBeVisible();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await page
    .getByRole('textbox', { name: 'Nickname', exact: true })
    .fill('Atlas Prime');
  await button(page, 'Save Pokémon').click();
  await page.reload();
  await expect(button(page, 'Select Atlas Prime')).toBeVisible();
  await mainTab(page, 'Settings').click();
  await button(page, 'Recovery history').click();
  await expect(button(page, 'Review saved version 1')).toBeVisible();
  await button(page, 'Review saved version 1').click();
  await button(page, 'Restore saved version').click();
  await mainTab(page, 'Ribbons').click();
  await expect(button(page, 'Select Atlas')).toBeVisible();
});

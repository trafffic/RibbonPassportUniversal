import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { button, demo, options, mainTab } from './helpers';

test('landing references follow the cards and the bottom bar stays aligned across pages', async ({ page }) => {
  let previous: { x: number; y: number; width: number; height: number } | undefined;
  for (const route of ['/', '/competitive', '/settings', '/library']) {
    await page.goto(route);
    if (route === '/' || route === '/competitive') {
      const lastAction = page.getByTestId(route === '/' ? 'landing-action-demo' : 'landing-action-library');
      const reference = page.getByTestId('landing-reference');
      await reference.scrollIntoViewIfNeeded();
      const card = (await lastAction.boundingBox())!;
      const note = (await reference.boundingBox())!;
      expect(note.y - card.y - card.height).toBeGreaterThanOrEqual(16);
      expect(note.y - card.y - card.height).toBeLessThanOrEqual(40);
      await expect(reference.getByRole('link')).toHaveAttribute('href', 'https://ribbons.guide');
      await expect(reference).toContainText('Ribbon Passport is not affiliated with ribbons.guide.');
    }
    const bar = page.viewportSize()!.width >= 700
      ? page.getByTestId('app-status-bar')
      : page.getByRole('tablist', { name: 'Main navigation' });
    await expect(bar).toBeVisible();
    const current = (await bar.boundingBox())!;
    if (previous) expect(current).toEqual(previous);
    previous = current;
  }
});
test('fresh install shows the ribbon empty state; Try demo fills it and Refresh demo is undoable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ribbon Pokémon', exact: true })).toBeVisible();
  await expect(button(page, 'Add Pokémon')).toBeVisible();
  await expect(button(page, 'Import ribbons.guide backup')).toBeVisible();
  await expect(button(page, 'Select Sparky')).toHaveCount(0);
  await expect(page.getByTestId('pc-artwork')).toHaveCount(0);
  await expect(page.getByTestId('landing-pixel-arrow')).toHaveCount(3);
  const alternative = page.getByRole('link', { name: 'for a tracker made free from ai go to ribbons.guide', exact: true });
  await expect(alternative).toHaveAttribute('href', 'https://ribbons.guide');
  await expect(alternative).toHaveAttribute('target', '_blank');
  await expect(page.getByText('Ribbon Passport is not affiliated with ribbons.guide.', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Ribbon Passport logo', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Ribbon Passport logo', exact: true })).toHaveAttribute('src', /ribbon-logo/);
  const ribbonSprites = await page.locator('[data-testid^="landing-sprite-"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testid')));
  expect(new Set(ribbonSprites).size).toBe(ribbonSprites.length);
  await button(page, 'Add Pokémon').click();
  await expect(page.getByRole('textbox', { name: 'Nickname', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await button(page, 'Import ribbons.guide backup').click();
  await expect(button(page, 'Choose backup file')).toBeVisible();
  await page.keyboard.press('Escape');
  await mainTab(page, 'Competitive').click();
  await expect(page.getByRole('heading', { name: 'Competitive Pokémon', exact: true })).toBeVisible();
  const competitiveSprites = await page.locator('[data-testid^="landing-sprite-"]').filter({ visible: true }).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-testid')));
  expect(competitiveSprites.length).toBeGreaterThan(0);
  expect(new Set(competitiveSprites).size).toBe(competitiveSprites.length);
  expect(competitiveSprites.some(species => ribbonSprites.includes(species))).toBe(false);
  await mainTab(page, 'Ribbons').click();
  await demo(page);
  await expect(page.getByTestId('collection-landing')).toHaveCount(0);
  await page.reload();
  await expect(button(page, 'Select Sparky')).toBeVisible();
  await button(page, 'Collection options').click();
  await expect(button(page, 'Try demo')).toHaveCount(0);
  await button(page, 'Refresh demo').click();
  await button(page, 'Refresh demo Pokémon').click();
  await expect(button(page, 'Select Sparky')).toBeVisible();
  const notice = page.getByText('Demo Pokémon ready. You can undo this change.').first();
  if (page.viewportSize()!.width >= 700) await expect(notice).toBeVisible();
  else await expect(notice).toHaveCount(0); // Mobile storage keeps notices out of its fitted controls.
});
test('competitive empty state offers Add Pokémon, Showdown import and the team library', async ({
  page,
}) => {
  await page.goto('/competitive');
  await expect(page.getByRole('heading', { name: 'Competitive Pokémon', exact: true })).toBeVisible();
  await expect(button(page, 'Import Showdown team')).toBeVisible();
  await button(page, 'Browse community teams').click();
  await expect(page).toHaveURL(/library/);
  await page.goBack();
  await button(page, 'Add Pokémon').click();
  await expect(page.getByRole('textbox').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await button(page, 'Import Showdown team').click();
  await page.getByRole('textbox', { name: 'Team name', exact: true }).fill('First team');
  await page.getByRole('textbox', { name: 'Showdown export', exact: true }).fill('Garchomp @ Leftovers\nAbility: Rough Skin\n- Earthquake');
  await button(page, 'Import team').click();
  await mainTab(page, 'Competitive').click();
  await expect(page.getByTestId('collection-landing')).toHaveCount(0);
  await mainTab(page, 'Ribbons').click();
  await expect(page.getByTestId('collection-landing')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ribbon Pokémon', exact: true })).toBeVisible();
});
test('party visibility persists per section and Export Ribbon Masters downloads', async ({
  page,
}) => {
  await demo(page);
  if (!(await button(page, 'Empty party slot 1').isVisible())) await button(page, 'Party').click();
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

test('adding the first Pokémon from either landing page opens storage and persists after reload', async ({ page }) => {
  for (const [route, nickname] of [['/', 'First ribbon partner'], ['/competitive', 'First battler']]) {
    await page.goto(route!);
    await expect(page.getByTestId('collection-landing')).toBeVisible();
    await button(page, 'Add Pokémon').click();
    await page.getByRole('button', { name: /^Species:/ }).click();
    await page.getByRole('textbox', { name: 'Search species', exact: true }).fill('metagross');
    await button(page, 'Choose #0376 Metagross').click();
    await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill(nickname!);
    await button(page, 'Add to box').click();
    await expect(page.getByTestId('collection-landing')).toHaveCount(0);
    await expect(button(page, `Select ${nickname}`)).toBeVisible();
    await page.reload();
    await expect(button(page, `Select ${nickname}`)).toBeVisible();
  }
});
test('a missing Pokémon offers a way back and Settings shows the version', async ({
  page,
}) => {
  await demo(page, '/passport/does-not-exist');
  await expect(
    page.getByText('This Pokémon is no longer in your collection.'),
  ).toBeVisible();
  await button(page, 'Recovery history').click();
  await expect(page).toHaveURL(/\/recovery/);
  await page.goto('/settings');
  await expect(page.getByText(/^Ribbon Passport \d+\.\d+\.\d+$/)).toBeVisible();
});

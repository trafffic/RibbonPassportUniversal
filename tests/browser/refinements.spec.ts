import { test, expect, type Page } from '@playwright/test';
import { backups, button, demo, download, mainTab, options } from './helpers';

async function species(page: Page, name: string, choice: string) {
  await page.getByRole('button', { name: /^Species:/ }).click();
  await page.getByRole('textbox', { name: 'Search species', exact: true }).fill(name);
  await button(page, `Choose ${choice}`).click();
}

test('unfinished forms restore after closing and reloading, then clear after saving or discarding', async ({ page }, info) => {
  await page.goto('/');
  await button(page, 'Add Pokémon').click();
  await species(page, 'pikachu', '#0025 Pikachu');
  await page.getByRole('button', { name: /^Form:/ }).click();
  await expect(button(page, 'Choose Alola')).toHaveCount(0);
  await button(page, 'Choose Alola Cap').click();
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('Cap draft');
  await page.getByRole('textbox', { name: 'Level', exact: true }).fill('42');
  await page.getByRole('switch', { name: 'Met level known', exact: true }).click();
  await button(page, 'Cancel').click();
  await page.reload();
  await button(page, 'Add Pokémon').click();
  await expect(page.getByText('Unfinished draft restored.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nickname', exact: true })).toHaveValue('Cap draft');
  await expect(page.getByRole('textbox', { name: 'Level', exact: true })).toHaveValue('42');
  await expect(page.getByRole('textbox', { name: 'Met level', exact: true })).toHaveValue('42');
  await expect(page.getByRole('button', { name: /^Form:/ })).toHaveAccessibleName('Form: Alola Cap');
  await expect.poll(() => button(page, 'Discard draft').evaluate(el => {
    for (let node: Element | null = el; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) return false;
    return true;
  })).toBe(true);
  await page.screenshot({ path: info.outputPath('restored-form.png'), fullPage: true });
  await button(page, 'Add to box').click();
  await expect(button(page, 'Select Cap draft')).toBeVisible();
  await expect(page.getByText('Pikachu · Alola Cap', { exact: true })).toBeVisible();
  await options(page, 'Add Pokémon');
  await expect(page.getByRole('textbox', { name: 'Nickname', exact: true })).toHaveValue('');
  await species(page, 'caterpie', '#0010 Caterpie');
  await button(page, 'Discard draft').click();
  await options(page, 'Add Pokémon');
  await expect(page.getByRole('button', { name: /^Species:/ })).toHaveAccessibleName('Species: Choose…');
  await button(page, 'Discard draft').click();
});

test('draft storage failure keeps the editor open until the user saves or discards', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('editor.') && value) throw new DOMException('Draft quota reached', 'QuotaExceededError');
      return setItem.call(this, key, value);
    };
  });
  await page.goto('/');
  await button(page, 'Add Pokémon').click();
  await species(page, 'caterpie', '#0010 Caterpie');
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('Unsaved draft');
  await expect(page.getByRole('alert').filter({ hasText: 'draft could not be stored' })).toBeVisible();
  await button(page, 'Cancel').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Draft storage failed' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Nickname', exact: true })).toHaveValue('Unsaved draft');
  await button(page, 'Discard draft').click();
  await expect(page.getByTestId('collection-landing')).toBeVisible();
});

test('old editor drafts cannot overwrite a newer saved revision', async ({ page }) => {
  await demo(page);
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('Unfinished rename');
  await button(page, 'Cancel').click();
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('editor.') && key.includes('.record.'))!;
    const draft = JSON.parse(localStorage.getItem(key)!);
    draft.baseRevision = 'older-revision';
    localStorage.setItem(key, JSON.stringify(draft));
  });
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await expect(page.getByRole('alert').filter({ hasText: 'older saved version' })).toBeVisible();
  await expect(button(page, 'Save Pokémon')).toHaveCount(0);
  await button(page, 'Discard draft').click();
  await expect(button(page, 'Select Sparky')).toBeVisible();
});

test('game choices suggest compatible games while retaining explicitly recorded other games', async ({ page }) => {
  await page.goto('/');
  await button(page, 'Add Pokémon').click();
  await species(page, 'sprigatito', '#0906 Sprigatito');
  await page.getByRole('button', { name: /^Current game:/ }).click();
  await page.getByRole('textbox', { name: 'Search current game', exact: true }).fill('Ruby');
  await expect(button(page, 'Choose Ruby')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Show all current games', exact: true }).click();
  await button(page, 'Choose Ruby').click();
  await expect(page.getByText('This current game is outside the compatible list', { exact: false })).toBeVisible();
  await button(page, 'Add to box').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await expect(page.getByRole('button', { name: /^Current game:/ })).toHaveAccessibleName('Current game: Ruby');
  await expect(page.getByRole('switch', { name: 'Show all current games', exact: true })).toHaveAttribute('aria-checked', 'false');
});

test('collection search combines number, shiny, species and game filters; box sorting is undoable', async ({ page }) => {
  await demo(page);
  await options(page, 'Find Pokémon');
  await page.getByRole('textbox', { name: 'Search Pokémon', exact: true }).fill('#0025');
  await expect(page.getByText('1 Pokémon found', { exact: true })).toBeVisible();
  await expect(button(page, 'Find Sparky')).toBeVisible();
  await page.getByRole('switch', { name: 'Shiny only', exact: true }).click();
  await expect(button(page, 'Find Sparky')).toBeVisible();
  await page.getByRole('button', { name: /^Filter species:/ }).click();
  await button(page, 'Choose #0025 Pikachu').click();
  await page.getByRole('button', { name: /^Filter current game:/ }).click();
  await button(page, 'Choose Sword').click();
  await expect(button(page, 'Find Sparky')).toBeVisible();
  await button(page, 'Clear search and filters').click();
  await expect(page.getByText('6 Pokémon found', { exact: true })).toBeVisible();
  await button(page, 'Done').click();
  const original = await page.getByTestId('pc-slot-3').getAttribute('aria-label');
  await button(page, 'Box options').click();
  await button(page, 'Sort box by Pokédex number').click();
  await expect(page.getByTestId('pc-slot-3')).toHaveAttribute('aria-label', 'Select Gardevoir');
  await button(page, 'Undo box sort').click();
  await expect(page.getByTestId('pc-slot-3')).toHaveAttribute('aria-label', original!);
});

test('pin an earnable mark, export it, reopen it, and clear it', async ({ page }, info) => {
  await demo(page);
  await button(page, 'Select Metagross').click();
  await button(page, 'Set ribbon goal').click();
  await page.getByRole('button', { name: /^Goal ribbon or mark:/ }).click();
  await page.getByRole('textbox', { name: 'Search goal ribbon or mark', exact: true }).fill('Partner Mark');
  await button(page, 'Choose Partner Mark').click();
  await page.getByRole('button', { name: /^Goal earning game:/ }).click();
  await button(page, 'Choose Scarlet').click();
  await button(page, 'Pin ribbon goal').click();
  await expect(page.getByTestId('ribbon-goal')).toContainText('Partner Mark · Scarlet');
  await page.reload();
  await expect(page.getByTestId('ribbon-goal')).toContainText('Partner Mark · Scarlet');
  await page.screenshot({ path: info.outputPath('pinned-goal.png'), fullPage: true });
  await backups(page);
  const raw = JSON.parse(await download(page, 'Export collection'));
  expect(raw.collection.records.find((r: any) => r.pokemon.species === 'metagross').pokemon.ribbonGoal).toEqual({ award: 'partner-mark', game: 'scar' });
  await button(page, 'Close').click();
  await mainTab(page, 'Ribbons').click();
  await button(page, 'Change ribbon goal').click();
  await button(page, 'Clear ribbon goal').click();
  await expect(page.getByTestId('ribbon-goal')).toHaveCount(0);
});

test('backup status survives reload and navigation, and detects subsequent content changes', async ({ page }) => {
  await demo(page);
  await backups(page);
  await expect(page.getByTestId('backup-status').filter({ visible: true }).last()).toContainText('No full collection export');
  await download(page, 'Export collection');
  await expect(page.getByTestId('backup-status').filter({ visible: true }).last()).toContainText('Collection matches that export.');
  await button(page, 'Close').click();
  await mainTab(page, 'Ribbons').click();
  await button(page, 'Select Gardevoir').click();
  await page.reload();
  await backups(page);
  await expect(page.getByTestId('backup-status').filter({ visible: true }).last()).toContainText('Collection matches that export.');
  await button(page, 'Close').click();
  await mainTab(page, 'Ribbons').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await page.getByRole('textbox', { name: 'Nickname', exact: true }).fill('New name after backup');
  await button(page, 'Save Pokémon').click();
  await backups(page);
  await expect(page.getByTestId('backup-status').filter({ visible: true }).last()).toContainText('Changes since that export');
});

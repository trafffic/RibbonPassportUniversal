import { test, expect } from '@playwright/test';
import { button, demo } from './helpers';
const text = [
  'Metagross @ Leftovers\nAbility: Clear Body\nLevel: 50\n- Meteor Mash',
  'Garchomp @ Choice Band\nAbility: Rough Skin\nLevel: 50\n- Earthquake',
].join('\n\n');
test('team arrange reorders, removes and defaults; team versions save, apply and take notes', async ({
  page,
}) => {
  await demo(page, '/import-showdown');
  await page.getByRole('textbox', { name: 'Team name', exact: true }).fill('Duo');
  await page.getByRole('textbox', { name: 'Showdown export' }).fill(text);
  await button(page, 'Import team').click();
  await expect(page.getByText('Default team ✓')).toBeVisible();
  const first = async () =>
    (await page.getByText(/^(Metagross|Garchomp)$/).allTextContents())[0];
  expect(await first()).toBe('Metagross');
  await button(page, 'Edit team').click();
  await button(page, 'Move Metagross down').click();
  await button(page, 'Save team').click();
  await expect.poll(first).toBe('Garchomp');
  await button(page, 'Edit team').click();
  await button(page, 'Remove Garchomp').click();
  await button(page, 'Save team').click();
  await expect(page.getByText('1 Pokémon')).toBeVisible();
  await button(page, 'Edit team').click();
  await button(page, 'Choose members').click();
  await button(page, 'Member Garchomp').click();
  await button(page, 'Save team').click();
  await expect(page.getByText('2 Pokémon')).toBeVisible();
  await page.getByRole('textbox', { name: 'Version name' }).fill('Lead');
  await button(page, 'Save current build').click();
  await expect(page.getByText('Version saved')).toBeVisible();
  await button(page, 'Notes Lead').click();
  await page.getByRole('textbox', { name: 'Version notes', exact: true }).fill('Rain core');
  await button(page, 'Save notes').click();
  await expect(page.getByText('Rain core')).toBeVisible();
  await button(page, 'Apply Lead').click();
  await expect(page.getByText('Team version applied').first()).toBeVisible();
  await button(page, 'Remove Lead').click();
  await expect(page.getByText('Rain core')).toHaveCount(0);
});

import { test, expect } from '@playwright/test';
import { button, mainTab } from './helpers';
const openHistory = async (page: import('@playwright/test').Page) => {
  await mainTab(page, 'Settings').click();
  await button(page, 'Recovery history').click();
};
test('edit a Pokémon, review its saved version and restore it', async ({
  page,
}) => {
  await page.goto('/');
  await openHistory(page);
  await expect(page.getByText('No saved versions yet').first()).toBeVisible();
  await mainTab(page, 'Ribbons').click();
  await button(page, 'Select Sparky').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Edit Pokémon').click();
  await page
    .getByRole('textbox', { name: 'Nickname', exact: true })
    .fill('Sparky Prime');
  await button(page, 'Save Pokémon').click();
  await expect(button(page, 'Select Sparky Prime')).toBeVisible();
  await openHistory(page);
  await button(page, 'Saved versions for Sparky Prime').click();
  await page.getByRole('button', { name: /^Before edit/ }).click();
  await expect(page.getByText('What will change')).toBeVisible();
  await expect(page.getByText(/Nickname: Sparky Prime → Sparky/)).toBeVisible();
  await button(page, 'Restore this version').click();
  await expect(page.getByText('Restored', { exact: true })).toBeVisible();
  await expect(button(page, 'Current version')).toBeDisabled();
  await mainTab(page, 'Ribbons').click();
  await expect(button(page, 'Select Sparky')).toBeVisible();
});
test('a deleted Pokémon appears under Deleted and returns to its original slot', async ({
  page,
}) => {
  await page.goto('/');
  await button(page, 'Select Sparky').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Delete').click();
  await button(page, 'Delete Pokémon').click();
  await expect(button(page, 'Select Sparky')).toHaveCount(0);
  await openHistory(page);
  await page.getByRole('tab', { name: 'Versions', exact: true }).click();
  await expect(button(page, 'Saved versions for Sparky')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Deleted', exact: true }).click();
  await button(page, 'Saved versions for Sparky').click();
  await page.getByRole('button', { name: /^Before deletion/ }).click();
  await expect(
    page.getByText('Return this Pokémon to your collection.'),
  ).toBeVisible();
  await button(page, 'Recover Pokémon').click();
  await expect(page.getByText('Restored', { exact: true })).toBeVisible();
  await mainTab(page, 'Ribbons').click();
  await expect(
    page.getByTestId('pc-slot-1').filter({ visible: true }).first(),
  ).toHaveAttribute('aria-label', 'Select Sparky');
});

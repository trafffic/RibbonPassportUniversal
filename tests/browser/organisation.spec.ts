import { test, expect, type Locator } from '@playwright/test';
import fs from 'node:fs';
import {
  button,
  mainTab,
  options,
  backups,
  download,
  importText,
  offline,
  demo,
} from './helpers';
test('the legacy demo opens with three boxes and no Next adventure placeholder', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Storage migration is independent of viewport size');
  await demo(page);
  await backups(page);
  const raw = JSON.parse(fs.readFileSync('tests/fixtures/native-app-v1.json', 'utf8'));
  raw.collection.storage.boxes = [
    { id: 'first', name: 'Box 01', slots: [] },
    { id: 'sample-box-2', name: 'Next adventure', slots: ['native-import-uuid'] },
  ];
  await importText(page, JSON.stringify(raw));
  await expect(button(page, 'Next adventure')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Box \d\d$/ })).toHaveCount(3);
  await expect(button(page, 'Next adventure')).toHaveCount(0);
  await button(page, 'Next box').click();
  await expect(button(page, 'Rename Box 02')).toBeVisible();
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute('aria-label', 'Select Archive');
  await button(page, 'Previous box').click();
  await button(page, 'Previous box').click();
  await expect(button(page, 'Rename Box 03')).toBeVisible();
  await page.reload();
  await expect(button(page, 'Rename Box 03')).toBeVisible();
  await button(page, 'Next box').click();
  await expect(button(page, 'Rename Box 01')).toBeVisible();
});
test('older saved collections gain three boxes per section without changing their contents', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Storage migration is independent of viewport size');
  await demo(page);
  await backups(page);
  await importText(page, fs.readFileSync('tests/fixtures/native-app-v1.json', 'utf8'));
  await expect(button(page, 'Select Archive')).toBeVisible();
  await backups(page);
  const before = JSON.parse(await download(page, 'Export collection')).collection;
  expect(before.boxes).toHaveLength(1);
  await page.goto('/');
  await page.reload();
  await expect(page.getByRole('button', { name: /^(Archive box|Box \d\d)$/ })).toHaveCount(3);
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute('aria-label', 'Select Archive');
  await backups(page);
  const after = JSON.parse(await download(page, 'Export collection')).collection;
  expect(after.boxes[0]).toEqual(before.boxes[0]);
  expect(after.records).toEqual(before.records);
  expect(after.source).toEqual(before.source);
  expect(after.partyIDs).toEqual(before.partyIDs);
  expect(after.selectedBoxID).toBe(before.selectedBoxID);
  await page.reload();
  await button(page, 'App backup').click();
  const reopened = JSON.parse(await download(page, 'Export collection')).collection;
  expect(reopened).toEqual(after);
});
test('box menus rename, automatic backgrounds, move/swap, party and undo persist correctly', async ({
  page,
  context,
}, info) => {
  await demo(page);
  await options(page, 'New box');
  await expect(button(page, 'Rename Box 04')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Box background: Savanna', exact: true })).toBeVisible();
  await button(page, 'Box options').click();
  await button(page, 'Rename box').click();
  await page
    .getByRole('textbox', { name: 'Box name', exact: true })
    .fill('Travellers');
  await expect(page.getByRole('button', { name: /^Wallpaper / })).toHaveCount(0);
  await button(page, 'Save box').click();
  await button(page, 'All boxes').click();
  await button(page, 'Box 01 · 6/30').click();
  await expect(page.getByRole('img', { name: 'Box background: Forest', exact: true })).toBeVisible();
  await button(page, 'Select Sparky').click();
  await button(page, 'Pokémon actions').click();
  await button(page, 'Move').click();
  await button(page, 'All boxes').click();
  await button(page, 'Travellers · 0/30').click();
  await button(page, 'Move to empty slot 30').click();
  await expect(page.getByTestId('pc-slot-30')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  if (page.viewportSize()!.width >= 700) {
    await button(page, 'Undo last change').click();
  } else {
    await expect(button(page, 'Undo last change')).toHaveCount(0);
    await button(page, 'Pokémon actions').click();
    await button(page, 'Move').click();
    await button(page, 'All boxes').click();
    await button(page, 'Box 01 · 5/30').click();
    await button(page, 'Move to empty slot 1').click();
  }
  await button(page, 'All boxes').click();
  await button(page, 'Box 01 · 6/30').click();
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
  expect(c.boxes.some((b: any) => b.name === 'Travellers')).toBe(true);
  await page.screenshot({
    path: info.outputPath('box-export.png'),
    fullPage: true,
  });
});
test('create empty collection, add and edit Pokémon, then recover the earlier version', async ({
  page,
}) => {
  await demo(page);
  await options(page, 'Start a new collection');
  await button(page, 'Create empty collection').click();
  await expect(button(page, 'Select Sparky')).toHaveCount(0);
  if (page.viewportSize()!.width >= 700) {
    await button(page, 'Undo last change').click();
  } else {
    await expect(button(page, 'Undo last change')).toHaveCount(0);
    await mainTab(page, 'Settings').click();
    await button(page, 'Recovery history').click();
    await button(page, 'Review collection archive 1').click();
    await button(page, 'Restore collection archive').click();
    await mainTab(page, 'Ribbons').click();
  }
  await expect(button(page, 'Select Sparky')).toBeVisible();
  await options(page, 'Add Pokémon');
  await page.getByRole('button', { name: /^Species:/ }).click();
  await page
    .getByRole('textbox', { name: 'Search species', exact: true })
    .fill('metagross');
  await button(page, 'Choose #0376 Metagross').click();
  await page
    .getByRole('textbox', { name: 'Nickname', exact: true })
    .fill('Atlas');
  const level = page.getByRole('textbox', { name: 'Level', exact: true });
  await expect(level).toHaveValue('5');
  await button(page, 'Increase Level').click();
  await expect(level).toHaveValue('6');
  await level.fill('250');
  await expect(level).toHaveValue('100');
  await expect(button(page, 'Increase Level')).toBeDisabled();
  await level.fill('42');
  await page.getByRole('switch', { name: 'Met level known', exact: true }).click();
  const met = page.getByRole('textbox', { name: 'Met level', exact: true });
  await expect(met).toHaveValue('42');
  await button(page, 'Decrease Met level').click();
  await expect(met).toHaveValue('41');
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
  await expect(button(page, 'Review collection archive 1')).toBeVisible();
  await button(page, 'Review collection archive 1').click();
  await button(page, 'Restore collection archive').click();
  await mainTab(page, 'Ribbons').click();
  await expect(button(page, 'Select Atlas')).toBeVisible();
});
test('dragging a sprite moves it, swaps, and pages boxes over the arrows', async ({
  page,
}) => {
  await demo(page);
  const label = (id: string) => page.getByTestId(id).getAttribute('aria-label');
  const centre = async (id: string) => {
    const box = (await page.getByTestId(id).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const drag = async (
    from: string,
    to: string | { x: number; y: number },
    pause = 0,
  ) => {
    const a = await centre(from),
      b = typeof to === 'string' ? await centre(to) : to;
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
    await page.mouse.move(b.x, b.y, { steps: 6 });
    if (pause) await page.waitForTimeout(pause);
    return b;
  };
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await drag('pc-slot-1', 'pc-slot-30');
  await page.mouse.up();
  await expect(page.getByTestId('pc-slot-30')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await expect(page.getByTestId('pc-slot-1')).toHaveAttribute(
    'aria-label',
    'Empty slot 1',
  );
  const other = await label('pc-slot-2');
  expect(other).toMatch(/^Select /);
  await drag('pc-slot-2', 'pc-slot-30');
  await page.mouse.up();
  await expect(page.getByTestId('pc-slot-2')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await expect(page.getByTestId('pc-slot-30')).toHaveAttribute(
    'aria-label',
    other!,
  );
  await options(page, 'New box');
  await button(page, 'All boxes').click();
  await button(page, 'Box 01 · 6/30').click();
  await button(page, 'Next box').scrollIntoViewIfNeeded();
  const next = (await button(page, 'Next box').boundingBox())!;
  await drag('pc-slot-2', { x: next.x + 5, y: next.y + 5 }, 900);
  await expect(button(page, 'Rename Box 02')).toBeVisible();
  const target = await centre('pc-slot-5');
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByTestId('pc-slot-5')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await button(page, 'Box 01').click();
  await expect(page.getByTestId('pc-slot-2')).toHaveAttribute(
    'aria-label',
    'Empty slot 2',
  );
});
test('dragging moves a box Pokémon into the party and a party Pokémon back to a slot', async ({
  page,
}) => {
  await demo(page);
  if (!(await button(page, 'Empty party slot 1').isVisible())) await button(page, 'Party').click();
  const centre = async (l: Locator) => {
    const box = (await l.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const drag = async (from: Locator, to: Locator) => {
    const a = await centre(from),
      b = await centre(to);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 10, a.y + 10, { steps: 3 });
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
  };
  const slot = page.getByTestId('pc-slot-1');
  await expect(slot).toHaveAttribute('aria-label', 'Select Sparky');
  await drag(slot, button(page, 'Empty party slot 1'));
  await expect(button(page, 'Select Sparky in party')).toBeVisible();
  await expect(slot).toHaveAttribute('aria-label', 'Empty slot 1');
  await drag(
    button(page, 'Select Sparky in party'),
    page.getByTestId('pc-slot-20'),
  );
  await expect(page.getByTestId('pc-slot-20')).toHaveAttribute(
    'aria-label',
    'Select Sparky',
  );
  await expect(button(page, 'Empty party slot 1')).toBeVisible();
});

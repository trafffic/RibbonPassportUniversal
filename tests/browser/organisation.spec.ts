import { test, expect, type Locator } from '@playwright/test';
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
test('box menus rename, wallpaper, move/swap, party and undo persist correctly', async ({
  page,
  context,
}, info) => {
  await demo(page);
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
  await demo(page);
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
  const level = page.getByRole('textbox', { name: 'Level', exact: true });
  await expect(level).toHaveValue('5');
  await button(page, 'Increase Level').click();
  await expect(level).toHaveValue('6');
  await level.fill('250');
  await expect(level).toHaveValue('100');
  await expect(button(page, 'Increase Level')).toBeDisabled();
  await level.fill('42');
  await button(page, 'Met level unknown').click();
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
  await button(page, 'Box 01').click();
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
  await button(page, 'Party').click();
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

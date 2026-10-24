import { test, expect } from '@playwright/test';
import { button, demo, options } from './helpers';

const routes = ['/', '/competitive', '/settings', '/teams', '/guides', '/library'];

test('Classic PC makes storage prominent and shows the selected Pokémon’s last-chance check', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1100, 'Classic PC is the desktop layout');
  await demo(page);
  await button(page, 'Select Gardevoir').click();
  const board = (await page.getByTestId('pc-artwork').boundingBox())!;
  const preview = page.getByTestId('classic-passport');
  const panel = (await preview.boundingBox())!;
  expect(board.width).toBeGreaterThan(panel.width * 1.5);
  expect(board.width / board.height).toBeCloseTo(208 / 192, 2);
  expect(panel.x).toBeGreaterThan(board.x + board.width);
  await expect(preview.getByText('Gardevoir', { exact: true })).toBeVisible();
  const check = preview.getByRole('button', { name: 'Review transfer check' });
  await expect(check).toContainText('Not safe to leave Gen VI');
  await expect(check).toContainText(/\d+ last-chance ribbons? to earn first/);
  await check.click();
  await expect(page.getByText('Earn before leaving', { exact: true })).toBeVisible();
  const dialogWarning = page.getByTestId('transfer-check-summary');
  expect(await dialogWarning.evaluate(el => getComputedStyle(el).borderWidth)).toBe('0px');
  await button(page, 'Done').click();
  await check.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focusStyle = await check.evaluate(el => ({
    outline: getComputedStyle(el).outlineColor,
    text: getComputedStyle(el.querySelector('[dir="auto"]') ?? el.firstElementChild!).color,
    visible: el.matches(':focus-visible'),
  }));
  expect(focusStyle.visible).toBe(true);
  expect(focusStyle.outline).toBe(focusStyle.text);
  await button(page, 'Select Sylveon').click();
  await expect(check).toContainText('Latest generation reached');
  await expect(check).toContainText('✓');
  await button(page, 'Select Sparky').click();
  await expect(preview.getByText('Sparky', { exact: true })).toBeVisible();
  await button(page, 'Open passport preview').click();
  await expect(page.getByTestId('studio')).toBeVisible();
  await button(page, 'Select Gardevoir').click();
  await expect(page).toHaveURL(/\/passport\/[a-z0-9]{7}$/);
});

test('desktop storage fits the viewport without stretching or scrolling, including laptop heights', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1100, 'Desktop collection');
  await demo(page);
  await button(page, 'Select Gardevoir').click();
  for (const [width, height] of [[1100, 720], [1366, 768], [1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    const art = page.getByTestId('pc-artwork');
    await expect.poll(async () => {
      const rect = (await art.boundingBox())!;
      return Math.abs(rect.width / rect.height - 208 / 192);
    }).toBeLessThan(0.01);
    const frame = (await art.boundingBox())!;
    expect(frame.height).toBeGreaterThan(250);
    const passport = (await page.getByTestId('classic-passport').boundingBox())!;
    expect(passport.y + passport.height).toBeLessThanOrEqual(height);
    for (const name of ['Collection options', 'Party', 'Pokémon actions', 'Box options', 'All boxes', 'Open passport preview']) {
      const rect = (await button(page, name).boundingBox())!;
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height, `${name} at ${width}×${height}`).toBeLessThanOrEqual(height);
    }
    const scrollable = await page.getByTestId('classic-collection').evaluate(el => {
      let current: Element | null = el;
      while (current) {
        const overflow = getComputedStyle(current).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && current.scrollHeight > current.clientHeight + 1) return true;
        current = current.parentElement;
      }
      return document.documentElement.scrollHeight > innerHeight;
    });
    expect(scrollable).toBe(false);
    const radius = await art.evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius));
    expect(radius).toBeGreaterThan(frame.width * 0.03);
  }
});

test('owned ribbons show a description on hover and keep the field guide reachable', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1100, 'Desktop passport preview');
  await demo(page);
  await button(page, 'Select Gardevoir').click();
  const ribbon = page.getByTestId('classic-passport').getByLabel('Details for Effort Ribbon', { exact: true });
  await ribbon.dispatchEvent('click');
  await expect(page.getByLabel('Ribbon description', { exact: true })).toHaveCount(0);
  await ribbon.hover();
  const description = page.getByLabel('Ribbon description', { exact: true });
  await expect(description).toContainText('Effort Ribbon');
  await expect(description).toContainText(/A Ribbon/);
  expect(await ribbon.evaluate(el => ({
    border: getComputedStyle(el).borderWidth,
    background: getComputedStyle(el).backgroundColor,
  }))).toEqual({ border: '0px', background: 'rgba(0, 0, 0, 0)' });
  expect(await description.evaluate(el => [...el.querySelectorAll('*')].some(child =>
    ['auto', 'scroll'].includes(getComputedStyle(child).overflowY),
  ))).toBe(false);
  const warning = page.getByTestId('classic-passport').getByRole('button', { name: 'Review transfer check' });
  expect(await warning.evaluate(el => [getComputedStyle(el).borderTopWidth, getComputedStyle(el).borderBottomWidth])).toEqual(['0px', '0px']);
  const guide = description.getByRole('button', { name: 'Field guide', exact: true });
  await guide.hover();
  await page.waitForTimeout(400);
  await expect(description).toBeVisible();
  await guide.click();
  await expect(page).toHaveURL(/\/guides\//);
  await expect(page.getByText('Effort Ribbon', { exact: true }).first()).toBeVisible();
});

test('box backgrounds follow box order and survive switching and reload', async ({ page }) => {
  await demo(page);
  const background = (name: string) => page.getByRole('img', { name: `Box background: ${name}`, exact: true });
  await expect(background('Forest')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Box \d\d$/, exact: true })).toHaveCount(3);
  await button(page, 'Previous box').click();
  await expect(button(page, 'Rename Box 03')).toBeVisible();
  await expect(background('Desert')).toBeVisible();
  await button(page, 'Next box').click();
  await expect(button(page, 'Rename Box 01')).toBeVisible();
  await button(page, 'Next box').click();
  await expect(background('City')).toBeVisible();
  await button(page, 'Next box').click();
  await expect(background('Desert')).toBeVisible();
  await button(page, 'Previous box').click();
  await expect(background('City')).toBeVisible();
  await button(page, 'Next box').click();
  await expect(background('Desert')).toBeVisible();
  await page.reload();
  await expect(background('Desert')).toBeVisible();
  await button(page, 'Box options').click();
  await expect(button(page, 'Wallpaper')).toHaveCount(0);
  await button(page, 'Rename box').click();
  await expect(page.getByRole('button', { name: /^Wallpaper / })).toHaveCount(0);
});

test('box arrows fit the wallpaper header and shiny badges sit in the top right', async ({ page }) => {
  await demo(page);
  const art = (await page.getByTestId('pc-artwork').boundingBox())!;
  for (const name of ['Previous box', 'Next box']) {
    const arrow = button(page, name);
    const rect = (await arrow.boundingBox())!;
    expect(Math.abs((rect.y + rect.height / 2 - art.y) / art.height - 20 / 192)).toBeLessThan(0.005);
    expect(rect.x).toBeGreaterThan(art.x + art.width * 0.11);
    expect(rect.x + rect.width).toBeLessThan(art.x + art.width * 0.87);
    const glyph = await arrow.evaluate(el => {
      const rect = el.firstElementChild!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    expect(glyph.width).toBeGreaterThanOrEqual(16);
    expect(glyph.width).toBeLessThanOrEqual(24);
    expect(Math.abs(glyph.y + glyph.height / 2 - rect.y - rect.height / 2)).toBeLessThan(1);
  }
  const shiny = page.locator('[data-testid^="pc-shiny-"]').first();
  await expect(shiny).toBeVisible();
  const badge = (await shiny.boundingBox())!;
  const slot = (await shiny.locator('..').boundingBox())!;
  expect(badge.y - slot.y).toBeLessThanOrEqual(4);
  expect(slot.x + slot.width - badge.x - badge.width).toBeLessThanOrEqual(4);
});

test('no screen scrolls sideways at any tested width', async ({ page }) => {
  await demo(page);
  for (const route of routes) {
    await page.goto(route);
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${route} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test('Competitive opens in the studio on wide screens only', async ({
  page,
}, info) => {
  await demo(page, '/import-showdown');
  await page.getByRole('textbox', { name: 'Team name', exact: true }).fill('Duo');
  await page
    .getByRole('textbox', { name: 'Showdown export' })
    .fill('Garchomp @ Choice Scarf\nAbility: Rough Skin\nLevel: 50\n- Earthquake');
  await button(page, 'Import team').click();
  await expect(page.getByText('Default team ✓')).toBeVisible();
  await page.goto('/competitive');
  const preview = page.getByTestId('studio');
  const wide = (page.viewportSize()?.width ?? 0) >= 1100;
  if (wide) await expect(preview).toBeVisible();
  else await expect(preview).toHaveCount(0);
  info.annotations.push({ type: 'width', description: String(page.viewportSize()?.width) });
});

test('buttons keep their natural width on desktop settings', async ({ page }) => {
  await demo(page, '/settings');
  const width = page.viewportSize()?.width ?? 0;
  test.skip(width < 700, 'phones stretch buttons by design');
  const box = await page.getByRole('button', { name: 'App backup', exact: true }).boundingBox();
  expect(box!.width).toBeLessThan(400);
});

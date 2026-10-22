import { expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
export const button = (p: Page, name: string) =>
  p.getByRole('button', { name, exact: true }).filter({ visible: true });
export const mainTab = (p: Page, name: string) =>
  p
    .getByRole('tablist', { name: 'Main navigation' })
    .getByRole('tab', { name, exact: true });
export const passportTab = (p: Page, name: string) =>
  p
    .getByRole('tablist', { name: 'Passport sections' })
    .getByRole('tab', { name, exact: true });
export async function options(p: Page, name: string) {
  await button(p, 'Collection options').click();
  await button(p, name).click();
}
export async function backups(p: Page) {
  await mainTab(p, 'Settings').click();
  await button(p, 'App backup').click();
}
export async function download(p: Page, label: string) {
  const wait = p.waitForEvent('download');
  await button(p, label).click();
  return fs.readFile((await (await wait).path())!, 'utf8');
}
export async function importText(p: Page, text: string) {
  const chooser = p.waitForEvent('filechooser');
  await button(p, 'Choose backup file').click();
  await (
    await chooser
  ).setFiles({
    name: 'app.json',
    mimeType: 'application/json',
    buffer: Buffer.from(text),
  });
  await button(p, 'Replace collection').click();
}
export async function record(p: Page, name: string) {
  await passportTab(p, 'Ribbons').click();
  await button(p, `Details for ${name}`).click();
  await button(p, 'Alpha Sapphire').click();
  await button(p, `Record ${name}`).click();
}
export async function offline(p: Page) {
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => p.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}
export async function demo(p: Page, path = '/') {
  await p.goto('/');
  await button(p, 'Try demo').click();
  await expect(button(p, 'Select Sparky')).toBeVisible();
  if (path !== '/') await p.goto(path);
}

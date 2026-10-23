import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { button, mainTab, backups, download, offline, demo } from './helpers';
const data = JSON.parse(
  fs.readFileSync('assets/data/community-content.json', 'utf8'),
);
test('bundled field guides, sources and personal team copies work offline', async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await demo(page);
  await mainTab(page, 'Settings').click();
  await button(page, 'Field guides').first().click();
  const guide = data.guideModules[0];
  await page
    .getByRole('textbox', { name: 'Find a ribbon or guide', exact: true })
    .fill(guide.title);
  await button(page, guide.title).click();
  await expect(page.getByText(guide.steps[0], { exact: true })).toBeVisible();
  await button(page, 'Sources').click();
  const source = data.sources.find((s: any) => s.id === guide.sourceIDs[0]);
  await button(page, source.author).click();
  await page
    .getByRole('textbox', { name: 'Private note', exact: true })
    .fill('Check this method on my cartridge.');
  await button(page, 'Save note').click();
  await expect(button(page, 'Saved')).toBeVisible();
  await mainTab(page, 'Settings').click();
  await expect(
    page.getByRole('heading', { name: 'SETTINGS', exact: true }),
  ).toBeVisible();
  await button(page, 'Team library').first().click();
  const team = data.teamCandidates[0];
  await page
    .getByRole('textbox', { name: 'Find a team or author', exact: true })
    .fill(team.title);
  await button(page, team.title).click();
  await button(page, 'Strategy').click();
  await expect(
    page.getByText(team.strategySummary, { exact: true }),
  ).toBeVisible();
  await button(page, 'Save personal copy').click();
  await button(page, 'Open my copy').click();
  await expect(
    page
      .getByText(team.title, { exact: true })
      .filter({ visible: true })
      .last(),
  ).toBeVisible();
  const teamText=await download(page,'Export Showdown team');
  expect(teamText).toContain(team.members[0].species);
  expect(teamText).toContain('- '+team.members[0].moves[0]);
  await button(page, 'Open build').first().click();
  await button(page, 'Edit build').click();
  await page
    .getByRole('textbox', { name: 'Item', exact: true })
    .fill('Leftovers');
  await page
    .getByRole('textbox', { name: 'Moves', exact: true })
    .fill('Protect\nSubstitute');
  await button(page, 'Save build').click();
  await page
    .getByRole('textbox', { name: 'Version name', exact: true })
    .fill('Lead');
  await button(page, 'Save current build').click();
  await expect(page.getByText('Version saved', { exact: true })).toBeVisible();
  await button(page, 'Edit build').click();
  await page
    .getByRole('textbox', { name: 'Item', exact: true })
    .fill('Choice Band');
  await button(page, 'Save build').click();
  await button(page, 'Compare Lead').click();
  await expect(page.getByText(/Item: Leftovers → Choice Band/)).toBeVisible();
  await button(page, 'Apply Lead').click();
  await expect(
    page.getByText('Matches current build', { exact: true }),
  ).toBeVisible();
  const versionText = await download(page, 'Export Lead');
  expect(versionText).toContain('@ Leftovers');
  expect(versionText).toContain('- Substitute');
  await offline(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Leftovers', { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath('competitive-build.png'),
    fullPage: true,
  });
  await backups(page);
  const c = JSON.parse(await download(page, 'Export collection')).collection;
  const copied = c.teams.filter((t: any) => t.communitySourceIDs);
  expect(copied).toHaveLength(1);
  expect(copied[0].communitySourceIDs).toEqual(team.sourceIDs);
  expect(
    c.records.find((r: any) => r.id === copied[0].memberIDs[0]).pokemon
      .showdownSet.moves,
  ).toEqual(['Protect', 'Substitute']);
  expect(c.sourceNotes[source.id]).toBe('Check this method on my cartridge.');
  const original=JSON.parse(await download(page,'Export original format'));
  expect(original.collection.competitiveStorage.boxes.length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
test('Journey memories validate dates and retain photos, notes and identity after reopen', async ({
  page,
  context,
}, info) => {
  await demo(page, '/notebook/sample-collection-v1-pokemon-4?section=Memories');
  await button(page, 'Add memory').click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Battle Maison trip');
  await expect(page.getByLabel('Date', { exact: true })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Date known', exact: true }).click();
  await page.getByLabel('Date', { exact: true }).fill('2024-02-29');
  await page
    .getByRole('textbox', { name: 'Your memory', exact: true })
    .fill('A close final battle.');
  const chooser = page.waitForEvent('filechooser');
  await button(page, 'Choose photo').click();
  await (await chooser).setFiles('assets/art/sprite-regular_pikachu.png');
  await expect(button(page, 'Remove photo')).toBeVisible();
  await button(page, 'Save memory').click();
  await expect(button(page, 'Battle Maison trip')).toBeVisible();
  await offline(page);
  await context.setOffline(true);
  await page.reload();
  await expect(button(page, 'Battle Maison trip')).toBeVisible();
  await expect(
    page.getByText('A close final battle.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath('memory.png'),
    fullPage: true,
  });
  await backups(page);
  const c = JSON.parse(await download(page, 'Export collection')).collection;
  const note = c.records.find((r: any) => r.pokemon.species === 'gardevoir')
    .pokemon.journal[0];
  expect(note.date).toBe('2024-02-29');
  expect(note.photo.length).toBeGreaterThan(10);
  expect(note.id).toBeTruthy();
});

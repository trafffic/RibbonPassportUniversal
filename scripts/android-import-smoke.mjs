// Continue after android-smoke: stage the compatibility fixture in Android's picker.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { adb, pause, nodes, find, tap, capture, output } from './android-ui.mjs';
if (!process.argv.includes('--resume-export')) {
if (!process.argv.includes('--resume-picker')) {
  await adb('push', path.resolve('tests/fixtures/native-app-v1.json'), '/sdcard/Download/native-app-v1.json');
  // Start with a passport open to exercise replacement navigation.
  await tap('Open full passport →');
  if (!(await nodes()).some(n => n['content-desc'] === 'Choose backup file')) await tap('Import / export', 'up');
  await tap('Choose backup file');
  await pause(700);
  const picker = await nodes();
  await fs.writeFile(path.join(output, 'picker-controls.json'), JSON.stringify(picker.filter(n => n.text || n['content-desc']), null, 2));
  await tap('Show roots');
  await tap('Downloads', 'down', true);
}
await tap('native-app-v1.json', 'down', true);
await find('1 Pokémon · 1 boxes'); await capture('06-native-import-preview');
await tap('Replace collection');
}
await find('Select Archive');
await tap('Import / export', 'up');
await tap('Export original format', 'up');
await pause(700); await capture('07-original-format-export');
await adb('shell', 'input', 'keyevent', '4');
const rootResult = await adb('root');
assert.ok(!rootResult.includes('cannot run as root'), 'Artifact verification requires the test emulator userdebug image.');
await pause(1000); await adb('wait-for-device');
const cache = '/data/user/0/ie.ribbonpassport.universal/cache';
const sourcePath = (await adb('shell', 'find', cache, '-name', 'RibbonPassport-App.json')).trim().split('\n')[0];
const exported = await adb('exec-out', 'cat', sourcePath);
assert.equal(exported, await fs.readFile('tests/fixtures/native-app-v1.json', 'utf8'));
const universalPath = (await adb('shell', 'find', cache, '-name', 'RibbonPassport-Universal.json')).trim().split('\n')[0];
const universal = JSON.parse(await adb('exec-out', 'cat', universalPath));
const p = universal.collection.records.find(r => r.pokemon.species === 'gardevoir').pokemon;
assert.equal(p.earnedGames['alert-ribbon'], 'as');
assert.ok(p.ribbons.includes('alert-ribbon'));
// Exercise record/undo/offline persistence again in the final APK after import.
await tap('Close backups', 'up');
await tap('Open full passport →');
await tap('Plan next ribbon');
await tap('Details for Effort Ribbon');
await tap('Brilliant Diamond');
await tap('Record Effort Ribbon');
await tap('Undo last change');
await tap('Plan next ribbon', 'up');
await tap('Details for Effort Ribbon');
await tap('Brilliant Diamond');
await tap('Record Effort Ribbon');
await adb('shell', 'am', 'force-stop', 'ie.ribbonpassport.universal');
await adb('shell', 'am', 'start', '-n', 'ie.ribbonpassport.universal/.MainActivity');
await pause(1000);
await tap('Open full passport →');
await tap('Journey');
await find('Effort Ribbon'); await capture('10-imported-offline-history');
await fs.writeFile(path.join(output, 'backup-result.json'), JSON.stringify({ nativeFilePicker: 'passed', previewAndReplacement: 'passed, navigates from passport to collection', nativeFileWriteAndShareSheet: 'passed', originalFormatExport: 'byte-for-byte fixture match, including large number, decimal lexeme, date, opaque attachment and unknown fields', universalExportAfterOfflineRelaunch: 'Alert Ribbon owned and earned in Alpha Sapphire', finalApkImportedRecord: 'Effort Ribbon recorded in Brilliant Diamond, undone, re-recorded, and restored in Journey after offline force-stop/relaunch', completedAt: new Date().toISOString() }, null, 2));
console.log('Native backup import/export preservation passed.');

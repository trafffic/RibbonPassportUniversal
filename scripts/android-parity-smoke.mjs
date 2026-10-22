// Local emulator validation. Imports through Android's document picker; existing data is archived by the app.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  adb,
  pause,
  nodes,
  find,
  tap,
  capture,
  output,
  width,
  height,
} from './android-ui.mjs';
const pkg = 'ie.ribbonpassport.universal',
  data = JSON.parse(
    await fs.readFile('assets/data/community-content.json', 'utf8'),
  );
const restart = async () => {
  await adb('shell', 'am', 'force-stop', pkg);
  await adb('shell', 'am', 'start', '-n', `${pkg}/.MainActivity`);
  await pause(1800);
};
await adb(
  'push',
  path.resolve('assets/data/demo-backup.json'),
  '/sdcard/Download/original-sprite-samples.json',
);
await restart();
await tap('Settings');
await tap('App backup');
await tap('Choose backup file');
await pause(800);
if ((await nodes()).some((n) => n['content-desc'] === 'Show roots'))
  await tap('Show roots');
if ((await nodes()).some((n) => n.text === 'Downloads'))
  await tap('Downloads', 'down', true);
await tap('original-sprite-samples.json', 'down', true);
await find('6 Pokémon · 1 boxes');
await tap('Replace collection');
await find('Select Gardevoir', 'up');
await capture('parity-phone-pc');
await tap('Select Gardevoir');
await tap('Open passport');
await find('Overview');
await capture('parity-phone-passport');
await tap('Ribbons', 'up');
await tap('Details for Alert Ribbon');
await tap('Alpha Sapphire');
await tap('Record Alert Ribbon');
await tap('Undo last change');
await tap('Details for Alert Ribbon', 'up');
await tap('Alpha Sapphire');
await tap('Record Alert Ribbon');
await tap('Journey', 'up');
await find('Stamp album');
await capture('parity-phone-journey');
await tap('Settings');
await tap('Field guides');
await tap(data.guideModules[0].title);
await find(data.guideModules[0].steps[0]);
await capture('parity-phone-guide');
await tap('Settings', 'up');
await tap('Team library');
await tap(data.teamCandidates[0].title);
await tap('Save personal copy');
await tap('Open my copy');
await tap('Open build');
await find('Moves');
await capture('parity-phone-build');
await tap('Ribbons', 'up');
await tap('Select Gardevoir', 'up');
await adb('shell', 'svc', 'wifi', 'disable');
await adb('shell', 'svc', 'data', 'disable');
await restart();
await find('Select Gardevoir');
await tap('Open passport');
await tap('Journey');
await find('Stamp album');
await capture('parity-phone-offline');
await tap('Settings');
await tap('App backup');
await tap('Export collection');
await pause(800);
await capture('parity-native-export');
await adb('shell', 'input', 'keyevent', '4');
await adb('root');
await pause(1000);
await adb('wait-for-device');
const file = (
  await adb(
    'shell',
    'find',
    `/data/user/0/${pkg}/cache`,
    '-name',
    'RibbonPassport-Universal.json',
  )
)
  .trim()
  .split(/\r?\n/)[0];
assert.ok(file);
const saved = JSON.parse(await adb('exec-out', 'cat', file)).collection;
const p = saved.records.find((r) => r.pokemon.species === 'gardevoir').pokemon;
assert.equal(p.earnedGames['alert-ribbon'], 'as');
assert.equal(saved.teams.length, 1);
assert.deepEqual(
  saved.teams[0].communitySourceIDs,
  data.teamCandidates[0].sourceIDs,
);
assert.ok(
  saved.records.find((r) => r.id === saved.teams[0].memberIDs[0]).pokemon
    .showdownSet,
);
await adb('shell', 'wm', 'size', '1600x2560');
await adb('shell', 'wm', 'density', '240');
await restart();
await find('Select Gardevoir');
await capture('parity-tablet-pc');
await tap('Open passport preview');
await find('Overview');
await capture('parity-tablet-passport');
await fs.writeFile(
  path.join(output, 'parity-result.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      platform: 'Android 36 x86_64 emulator',
      phone: { width, height, density: 420 },
      tablet: { width: 1600, height: 2560, density: 240 },
      passed: [
        'native document-picker sample import',
        'Classic PC selection and passport',
        'ribbon earning game, undo and repeat',
        'Journey',
        'bundled field guide',
        'attributed independent team copy and battle build',
        'offline force-stop/reopen and SQLite restore',
        'native JSON export verifies ownership, earning game and stable team identities',
        'tablet PC preview and Passport Studio',
      ],
      ios: 'Blocked: user has no Mac or cloud Mac access.',
    },
    null,
    2,
  ),
);
console.log('Android parity phone/tablet flow passed.');

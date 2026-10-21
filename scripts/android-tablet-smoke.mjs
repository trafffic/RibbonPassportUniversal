// Native tablet display configuration pass after the native import fixture.
import fs from 'node:fs/promises';
import path from 'node:path';
import { adb, pause, find, tap, capture, output } from './android-ui.mjs';
const pkg = 'ie.ribbonpassport.universal';
await adb('shell', 'wm', 'size', '1600x2560');
await adb('shell', 'wm', 'density', '240');
await adb('shell', 'am', 'force-stop', pkg);
await adb('shell', 'am', 'start', '-n', `${pkg}/.MainActivity`);
await pause(1500);
await find('PC storage'); await capture('08-native-tablet-collection');
await tap('Select Archive');
await tap('Open full passport →');
await tap('Plan next ribbon');
await tap('Details for Alert Ribbon');
await find('Record Alert Ribbon'); await capture('09-native-tablet-passport');
await fs.writeFile(path.join(output, 'tablet-result.json'), JSON.stringify({ platform: 'Android', display: { width: 1600, height: 2560, densityDpi: 240 }, checks: ['same native APK at tablet display configuration', 'restored imported collection', 'PC selection and quick preview', 'passport and ribbon planning touch controls'], completedAt: new Date().toISOString() }, null, 2));
console.log('Native tablet configuration flow passed.');

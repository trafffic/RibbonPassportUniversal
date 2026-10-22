import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile),
  [adb, serial] = process.argv.slice(2);
if (!adb || !serial?.startsWith('emulator-'))
  throw new Error('Use the explicitly selected local emulator.');
const verify = await fs.readFile('.tools/verify-parity.log', 'utf8'),
  browser = await fs.readFile('.tools/parity-browser-final.log', 'utf8'),
  native = await fs.readFile('.tools/parity-native-final.log', 'utf8');
if (
  !/pass 54/.test(verify) ||
  !/32 passed/.test(browser) ||
  !native.includes('Android parity phone/tablet flow passed.')
)
  throw new Error(
    'Complete all final verification before recording the result.',
  );
const artifact = 'android/app/build/outputs/apk/release/app-release.apk',
  bytes = await fs.readFile(artifact),
  sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const installed = (
  await run(adb, [
    '-s',
    serial,
    'shell',
    'pm',
    'path',
    'ie.ribbonpassport.universal',
  ])
).stdout
  .trim()
  .split(/\r?\n/)
  .find((line) => line.endsWith('/base.apk'))
  ?.replace(/^package:/, '');
if (!installed?.startsWith('/data/app/'))
  throw new Error('Cannot verify installed app path.');
const installedHash = (
  await run(adb, ['-s', serial, 'shell', 'sha256sum', installed])
).stdout
  .trim()
  .split(/\s+/)[0];
if (installedHash !== sha256)
  throw new Error('Installed APK does not match the recorded artifact.');
const names = (
  await run(
    'C:/Program Files/Java/jdk-21/bin/jar.exe',
    ['tf', path.resolve(artifact)],
    { maxBuffer: 8 * 1024 * 1024 },
  )
).stdout;
const replacementPortraitEntries = names
  .split(/\r?\n/)
  .filter((line) => /portrait/i.test(line)).length;
if (replacementPortraitEntries)
  throw new Error('Unexpected replacement portrait entries.');
const result = {
  package: 'ie.ribbonpassport.universal',
  artifact,
  bytes: bytes.length,
  sha256,
  installedSha256: installedHash,
  mode: 'Bundled release-mode APK; generated debug signing key; local emulator testing only',
  architecture: 'x86_64',
  command: './scripts/build-android-windows.ps1',
  originalSampleSprites: 12,
  additionalCommunitySprites: 27,
  replacementPortraitEntries,
  domainBackupStorageArtworkTests: 54,
  browserTests: 32,
  published: false,
  pushed: false,
  recordedAt: new Date().toISOString(),
};
await fs.writeFile(
  'docs/validation/android/parity-build.json',
  JSON.stringify(result, null, 2),
);
const source = await fs.readFile('assets/data/community-content.json'),
  reference = await fs.readFile(
    'C:/Users/killi/Documents/GitHub/RibbonPassportMain/RibbonPassport/RibbonAssets/community-content.json',
  );
if (!source.equals(reference))
  throw new Error('Community data differs from reference.');
console.log(
  'Final APK checksum matches installed package. All recorded checks passed.',
);

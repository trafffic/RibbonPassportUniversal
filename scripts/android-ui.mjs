// Runs only against an explicitly selected emulator. Does not clear app data.
// Usage: node scripts/android-smoke.mjs <absolute adb.exe> emulator-5554
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const run = promisify(execFile);
const [adbPath, serial] = process.argv.slice(2);
if (!adbPath || !serial?.startsWith('emulator-')) throw new Error('Pass adb path and an emulator serial; physical devices are excluded.');
const output = path.resolve('docs/validation/android');
await fs.mkdir(output, { recursive: true });
const adb = async (...args) => (await run(adbPath, ['-s', serial, ...args], { maxBuffer: 8 * 1024 * 1024 })).stdout;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const decode = text => text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
let lastXML = '';
async function nodes() {
  await adb('shell', 'uiautomator', 'dump', '/sdcard/ribbon-window.xml');
  lastXML = await adb('shell', 'cat', '/sdcard/ribbon-window.xml');
  return [...lastXML.matchAll(/<node\b([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])])));
}
const size = await adb('shell', 'wm', 'size');
const [width, height] = [...size.matchAll(/(\d+)x(\d+)/g)].at(-1).slice(1).map(Number);
const swipe = async direction => {
  await adb('shell', 'input', 'swipe', String(Math.round(width / 2)), String(Math.round(height * (direction === 'down' ? 0.78 : 0.27))), String(Math.round(width / 2)), String(Math.round(height * (direction === 'down' ? 0.27 : 0.78))), '280');
  await pause(250);
};
async function find(label, direction = 'down', buttonsOnly = false) {
  for (const way of [direction, direction === 'down' ? 'up' : 'down']) {
    for (let i = 0; i < 10; i++) {
      const found = (await nodes()).find(n => {
        if (n['content-desc'] !== label && (buttonsOnly || n.text !== label)) return false;
        // Android can report offscreen scroll children with inverted/clipped bounds.
        // Such nodes are in the hierarchy but cannot receive a tap.
        const bounds = [...(n.bounds ?? '').matchAll(/\d+/g)].map(x => Number(x[0]));
        return bounds.length === 4 && bounds[2] - bounds[0] >= 10 && bounds[3] - bounds[1] >= 10;
      });
      if (found) return found;
      await swipe(way);
    }
  }
  await fs.writeFile(path.join(output, 'failure.xml'), lastXML);
  await capture('failure');
  throw new Error(`Native control not found: ${label}`);
}
async function tap(label, direction = 'down', allowText = false) {
  const node = await find(label, direction, !allowText);
  const values = [...node.bounds.matchAll(/\d+/g)].map(x => Number(x[0]));
  assert.notEqual(node.enabled, 'false', `${label} is disabled`);
  await adb('shell', 'input', 'tap', String(Math.round((values[0] + values[2]) / 2)), String(Math.round((values[1] + values[3]) / 2)));
  await pause(400);
  console.log(`Tapped ${label}`);
  return node;
}
async function capture(name) {
  await nodes();
  await adb('shell', 'screencap', '-p', '/sdcard/ribbon-screen.png');
  await adb('pull', '/sdcard/ribbon-screen.png', path.join(output, `${name}.png`));
  await fs.writeFile(path.join(output, `${name}.xml`), lastXML);
}

export { adb, pause, nodes, find, tap, capture, output, width, height };

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';

test('updates activate with an open tab, reload fresh HTML, and still open offline', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Service worker lifecycle is independent of viewport size');
  const worker = fs.readFileSync('dist/sw.js', 'utf8')
    .replace(/^const FILES=.*;$/m, 'const FILES=["/index.html"];');
  let version = 1;
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(worker.replace(/^const CACHE=.*;$/m, `const CACHE="ribbon-passport-preview-test-${version}";`));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<p>Preview version ${version}</p><script>navigator.serviceWorker.register('/sw.js')</script>`);
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.getByText('Preview version 1', { exact: true })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    version = 2;
    await page.evaluate(async () => {
      const changed = new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      await (await navigator.serviceWorker.ready).update();
      await changed;
    });
    await page.reload();
    await expect(page.getByText('Preview version 2', { exact: true })).toBeVisible();
    version = 3;
    await page.reload();
    await expect(page.getByText('Preview version 3', { exact: true })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText('Preview version 3', { exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await page.goto('about:blank');
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('a legacy cache updates with two tabs open and preserves collection storage and old assets', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Service worker lifecycle is independent of viewport size');
  const worker = fs.readFileSync('dist/sw.js', 'utf8')
    .replace(/^const FILES=.*;$/m, 'const FILES=["/index.html"];');
  let version = 1;
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(version === 1 ? `
        const CACHE='ribbon-passport-legacy-test-1';
        self.addEventListener('install', e => e.waitUntil((async()=>{
          await (await caches.open(CACHE)).addAll(['/index.html','/old.js']);
        })()));
        self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
        self.addEventListener('fetch', e => e.respondWith((async()=>{
          const cache=await caches.open(CACHE);
          return await cache.match(e.request.mode==='navigate'?'/index.html':e.request)||fetch(e.request);
        })()));` : worker.replace(/^const CACHE=.*;$/m, 'const CACHE="ribbon-passport-upgrade-test-2";'));
    } else if (req.url === '/old.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.writeHead(version === 1 ? 200 : 404);
      res.end(version === 1 ? 'old bundle retained' : 'missing');
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<p>Version ${version}</p><script>navigator.serviceWorker.register('/sw.js')</script>`);
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const other = await context.newPage();
  try {
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await other.goto(origin);
    const saved = JSON.stringify({ nickname: 'Keep me', ribbons: ['effort-ribbon'] });
    await page.evaluate((value) => new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('ribbon-passport-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('documents', 'readwrite');
        transaction.objectStore('documents').put(value, 'collection');
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    }), saved);
    version = 2;
    await page.evaluate(async () => {
      const changed = new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
      await (await navigator.serviceWorker.ready).update();
      await changed;
    });
    // The other tab keeps its page; activation must not forcibly reload unsaved work.
    await expect(other.getByText('Version 1', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => new Promise<string>((resolve, reject) => {
      const request = indexedDB.open('ribbon-passport-v1', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const read = db.transaction('documents').objectStore('documents').get('collection');
        read.onsuccess = () => { db.close(); resolve(read.result); };
        read.onerror = () => reject(read.error);
      };
    }))).toBe(saved);
    await context.setOffline(true);
    expect(await other.evaluate(async () => (await fetch('/old.js')).text())).toBe('old bundle retained');
    await page.reload();
    await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
    await other.close();
    await page.goto('about:blank');
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

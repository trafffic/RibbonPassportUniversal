import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';

test('local previews activate updates with an open tab, reload fresh HTML, and still open offline', async ({ page, context }, info) => {
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

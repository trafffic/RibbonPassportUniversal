// Local production preview only. Keep a small set of current visual QA artifacts.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const output = 'docs/validation/web';
await fs.mkdir(output, { recursive: true });
const data = JSON.parse(
  await fs.readFile('assets/data/community-content.json', 'utf8'),
);
const browser = await chromium.launch();
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 1050],
    ['phone', 390, 844],
    ['small-phone', 320, 740],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => {
      throw e;
    });
    await page.goto('http://127.0.0.1:8081/');
    await page
      .getByRole('button', { name: 'Select Gardevoir', exact: true })
      .click();
    await page.screenshot({ path: `${output}/parity-${name}-pc.png` });
    await page
      .getByRole('button', {
        name: width >= 980 ? 'Open passport preview' : 'Open passport',
        exact: true,
      })
      .click();
    await page.getByRole('tablist', { name: 'Passport sections' }).waitFor();
    await page.screenshot({ path: `${output}/parity-${name}-passport.png` });
    if (name === 'desktop') {
      await page.goto(
        'http://127.0.0.1:8081/guides/' + data.guideModules[0].id,
      );
      await page.getByRole('button', { name: 'Steps', exact: true }).waitFor();
      await page.screenshot({ path: `${output}/parity-desktop-guide.png` });
      await page.goto('http://127.0.0.1:8081/library');
      await page
        .getByRole('textbox', { name: 'Find a team or author', exact: true })
        .fill(data.teamCandidates[0].title);
      await page.screenshot({ path: `${output}/parity-desktop-library.png` });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(
  'Captured desktop, phone and small-phone production layouts, field guide and team library.',
);

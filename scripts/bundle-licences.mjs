// Bundles the licence notices and app credits (copied unchanged from the iPhone
// app) into one JSON file Metro can import. Rerun after changing assets/Licences.
import fs from 'node:fs';
import path from 'node:path';
const dir = 'assets/Licences';
const notices = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()
  .map((f) => ({
    name: path.basename(f, '.txt'),
    text: fs.readFileSync(path.join(dir, f), 'utf8'),
  }));
const credits = fs.readFileSync('assets/credits.md', 'utf8');
fs.writeFileSync(
  'assets/data/licences.json',
  JSON.stringify({ notices, credits }) + '\n',
);
console.log(`Bundled ${notices.length} notices and the app credits.`);

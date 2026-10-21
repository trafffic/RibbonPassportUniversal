import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
const files = walk('dist').filter(file => !file.endsWith('.map') && !file.endsWith('sw.js'));
const revision = crypto.createHash('sha256');
for (const file of files) revision.update(fs.readFileSync(file));
const cache = `ribbon-passport-${revision.digest('hex').slice(0, 16)}`;
const urls = files.map(file => '/' + file.replaceAll('\\', '/').slice(5));
fs.writeFileSync('dist/sw.js', `const CACHE=${JSON.stringify(cache)};
const FILES=${JSON.stringify(urls)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ribbon-passport-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode==='navigate')return await cache.match('/index.html')||fetch(event.request);
    return await cache.match(event.request)||fetch(event.request);
  })());
});
`);
console.log(`Offline shell: ${files.length} bundled files, ${cache}`);

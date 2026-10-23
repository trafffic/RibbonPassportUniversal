import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// Installable app: manifest, theme colour and home-screen icon (files come from public/).
const indexPath = 'dist/index.html';
const head = '<link rel="manifest" href="/manifest.webmanifest"/><meta name="theme-color" content="#1E2C1F"/><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>';
const index = fs.readFileSync(indexPath, 'utf8');
if (!index.includes('rel="manifest"')) fs.writeFileSync(indexPath, index.replace('</head>', head + '</head>'));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
const files = walk('dist').filter(file => !file.endsWith('.map') && !file.endsWith('sw.js'));
const revision = crypto.createHash('sha256');
for (const file of files) revision.update(fs.readFileSync(file));
const cache = `ribbon-passport-${revision.digest('hex').slice(0, 16)}`;
const urls = files.map(file => '/' + file.replaceAll('\\', '/').slice(5));
fs.writeFileSync('dist/sw.js', `const CACHE=${JSON.stringify(cache)};
const FILES=${JSON.stringify(urls)};
const LOCAL_PREVIEW=['localhost','127.0.0.1','[::1]'].includes(self.location.hostname);
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES);
  if(LOCAL_PREVIEW)await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('ribbon-passport-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(event.request.mode==='navigate'){
      if(LOCAL_PREVIEW){
        try{
          const response=await fetch(event.request,{cache:'no-store'});
          if(response.ok){await cache.put('/index.html',response.clone());return response;}
        }catch{}
      }
      return await cache.match('/index.html')||fetch(event.request);
    }
    return await cache.match(event.request)||fetch(event.request);
  })());
});
`);
console.log(`Offline shell: ${files.length} bundled files, ${cache}`);

const CACHE = 'rp-sprites-v1';
const live = new Map<string, Promise<string>>();

/**
 * Resolves a remote sprite to a displayable URI. On the web the image is kept
 * in Cache Storage so it still shows offline; elsewhere the URL is returned and
 * the platform image cache applies.
 */
export function resolveSprite(url: string): Promise<string> {
  if (typeof caches === 'undefined' || typeof URL.createObjectURL !== 'function')
    return Promise.resolve(url);
  let job = live.get(url);
  if (!job) {
    job = (async () => {
      const cache = await caches.open(CACHE);
      let res = await cache.match(url);
      if (!res) {
        const fetched = await fetch(url, { mode: 'cors' });
        if (!fetched.ok) throw new Error('sprite ' + fetched.status);
        await cache.put(url, fetched.clone());
        res = fetched;
      }
      return URL.createObjectURL(await res.blob());
    })();
    live.set(url, job);
    // Remember a miss for a minute so every sprite on screen doesn't refetch it.
    job.catch(() => setTimeout(() => live.delete(url), 60_000));
  }
  return job;
}

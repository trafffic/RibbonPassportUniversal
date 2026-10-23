import { spriteBounds } from './sprite-bounds';

// Retain the original cache so previously downloaded sprites still work offline.
const RAW_CACHE = 'rp-sprites-v1';
const PREPARED_CACHE = 'rp-sprites-trimmed-v1';
const live = new Map<string, Promise<string>>();

async function prepare(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Sprite canvas unavailable');
    context.drawImage(bitmap, 0, 0);
    const bounds = spriteBounds(
      context.getImageData(0, 0, bitmap.width, bitmap.height).data,
      bitmap.width,
      bitmap.height,
    );
    // Match bundled sprites: trim padding and enlarge original pixels eightfold.
    canvas.width = bounds.width * 8;
    canvas.height = bounds.height * 8;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      bitmap,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error('Sprite encoding failed')),
        'image/png',
      );
    });
  } finally {
    bitmap.close();
  }
}

export function resolveSprite(url: string): Promise<string> {
  let job = live.get(url);
  if (!job) {
    job = (async () => {
      const prepared = await caches.open(PREPARED_CACHE);
      let response = await prepared.match(url);
      if (!response) {
        const raw = await caches.open(RAW_CACHE);
        let original = await raw.match(url);
        if (!original) {
          original = await fetch(url, { mode: 'cors' });
          if (!original.ok) throw new Error('sprite ' + original.status);
          await raw.put(url, original.clone());
        }
        const blob = await prepare(await original.blob());
        response = new Response(blob, {
          headers: { 'Content-Type': 'image/png' },
        });
        await prepared.put(url, response.clone());
      }
      return URL.createObjectURL(await response.blob());
    })();
    live.set(url, job);
    job.catch(() => setTimeout(() => live.delete(url), 60_000));
  }
  return job;
}

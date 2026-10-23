// Build-time only: derives the web app icons and Android adaptive icon from the
// original iPhone app icon (assets/icon.png). No network access.
import fs from 'node:fs';
import { PNG } from 'pngjs';
const src = PNG.sync.read(fs.readFileSync('assets/icon.png'));
const px = (x, y) => {
  const i = (y * src.width + x) * 4;
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
};
// Box-average downscale so the pixel artwork stays even at small sizes.
function resize(size) {
  const out = new PNG({ width: size, height: size });
  const f = src.width / size;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      let n = 0;
      for (let yy = Math.floor(y * f); yy < Math.floor((y + 1) * f); yy++)
        for (let xx = Math.floor(x * f); xx < Math.floor((x + 1) * f); xx++) {
          px(xx, yy).forEach((v, k) => (sum[k] += v));
          n++;
        }
      const o = (y * size + x) * 4;
      for (let k = 0; k < 4; k++) out.data[o + k] = Math.round(sum[k] / n);
    }
  return out;
}
fs.mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512])
  fs.writeFileSync(`public/icons/icon-${size}.png`, PNG.sync.write(resize(size)));
fs.writeFileSync('public/icons/apple-touch-icon.png', PNG.sync.write(resize(180)));
// Android masks the edges; the original already pads its star, so a slight inset keeps it in the safe zone.
const inner = resize(872),
  adaptive = new PNG({ width: 1024, height: 1024 });
const [r, g, b] = px(4, 4);
for (let i = 0; i < adaptive.data.length; i += 4) adaptive.data.set([r, g, b, 255], i);
for (let y = 0; y < 872; y++)
  for (let x = 0; x < 872; x++) {
    const s = (y * 872 + x) * 4,
      d = ((y + 76) * 1024 + x + 76) * 4;
    adaptive.data.set(inner.data.subarray(s, s + 4), d);
  }
fs.writeFileSync('assets/adaptive-icon.png', PNG.sync.write(adaptive));
console.log(`Icons written; adaptive background #${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);

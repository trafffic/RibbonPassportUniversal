import type { pcMetrics } from './wallpapers';
export type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
export type PCTarget =
  | { kind: 'box'; slot: number }
  | { kind: 'party'; slot: number }
  | { kind: 'page'; direction: -1 | 1 };
export type PCFrame = { target: PCTarget; rect: Rect };
/** The iPhone header is laid out for a board about 340 pt wide; scale it with the board. */
export const headerScale = (boardWidth: number) =>
  Math.min(2.2, Math.max(0.75, boardWidth / 340));
/** Interior of the wallpaper's title capsule, in its original 208 × 192 pixels. */
export function pcHeader(art: Rect) {
  return {
    x: art.x + art.width * 24 / 208,
    y: art.y + art.height * 8 / 192,
    width: art.width * 156 / 208,
    height: art.height * 24 / 192,
    arrowWidth: Math.min(56, Math.max(32, art.width * 24 / 208)),
  };
}
const contains = (r: Rect, p: Point) =>
  r.width > 0 &&
  r.height > 0 &&
  p.x >= r.x &&
  p.x < r.x + r.width &&
  p.y >= r.y &&
  p.y < r.y + r.height;
export function pcFrames(
  m: typeof pcMetrics,
  art: Rect,
  party: Rect[] = [],
): PCFrame[] {
  const sx = art.width / m.width,
    sy = art.height / m.height,
    cellW = (m.gridWidth * sx) / m.columns,
    cellH = (m.gridHeight * sy) / m.rows,
    header = pcHeader(art);
  return [
    ...Array.from({ length: m.columns * m.rows }, (_, slot) => ({
      target: { kind: 'box', slot } as PCTarget,
      rect: {
        x: art.x + m.x * sx + (slot % m.columns) * cellW,
        y: art.y + m.y * sy + Math.floor(slot / m.columns) * cellH,
        width: cellW,
        height: cellH,
      },
    })),
    ...party.map((rect, slot) => ({
      target: { kind: 'party', slot } as PCTarget,
      rect,
    })),
    {
      target: { kind: 'page', direction: -1 } as PCTarget,
      rect: { x: header.x, y: header.y, width: header.arrowWidth, height: header.height },
    },
    {
      target: { kind: 'page', direction: 1 } as PCTarget,
      rect: {
        x: header.x + header.width - header.arrowWidth,
        y: header.y,
        width: header.arrowWidth,
        height: header.height,
      },
    },
  ];
}
export const hitTest = (point: Point, frames: PCFrame[]): PCTarget | null =>
  frames.find((f) => contains(f.rect, point))?.target ?? null;
export const pageIndex = (index: number, count: number, direction: number) =>
  (((index + direction) % count) + count) % count;

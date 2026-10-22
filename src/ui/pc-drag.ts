import type { pcMetrics } from './wallpapers';
export type Rect = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };
export type PCTarget =
  | { kind: 'box'; slot: number }
  | { kind: 'party'; slot: number }
  | { kind: 'page'; direction: -1 | 1 };
export type PCFrame = { target: PCTarget; rect: Rect };
const arrowWidth = 28;
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
    headerY = art.y + art.height * 0.03,
    headerH = art.height * 0.13,
    headerX = art.x + art.width * 0.09,
    headerW = art.width * 0.82;
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
      rect: { x: headerX, y: headerY, width: arrowWidth, height: headerH },
    },
    {
      target: { kind: 'page', direction: 1 } as PCTarget,
      rect: {
        x: headerX + headerW - arrowWidth,
        y: headerY,
        width: arrowWidth,
        height: headerH,
      },
    },
  ];
}
export const hitTest = (point: Point, frames: PCFrame[]): PCTarget | null =>
  frames.find((f) => contains(f.rect, point))?.target ?? null;
export const pageIndex = (index: number, count: number, direction: number) =>
  (((index + direction) % count) + count) % count;

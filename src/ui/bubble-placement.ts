export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface BubblePlacement {
  frame: Rect;
  above: boolean;
  tipX: number;
}
// Mirrors Swift RibbonBubblePlacement: prefer above the ribbon, stay inside the container.
export function bubblePlacement(
  container: { width: number; height: number },
  anchor: Rect,
  contentHeight: number,
): BubblePlacement {
  const margin = 12,
    gap = 12,
    width = Math.max(1, Math.min(280, container.width - margin * 2)),
    height = Math.max(1, contentHeight),
    roomAbove = Math.max(1, anchor.y - gap - margin),
    roomBelow = Math.max(
      1,
      container.height - (anchor.y + anchor.height) - gap - margin,
    ),
    above =
      height <= roomAbove || (height > roomBelow && roomAbove >= roomBelow),
    fitted = Math.min(height, above ? roomAbove : roomBelow),
    midX = anchor.x + anchor.width / 2,
    x = Math.max(
      margin,
      Math.min(container.width - margin - width, midX - width / 2),
    ),
    y = above ? anchor.y - gap - fitted : anchor.y + anchor.height + gap;
  return {
    frame: { x, y, width, height: fitted },
    above,
    tipX: Math.max(14, Math.min(width - 14, midX - x)),
  };
}

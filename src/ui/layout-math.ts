export type LayoutClass = "phone" | "tablet" | "desktop" | "wide";

export const breakpoints = { tablet: 700, desktop: 1100, wide: 1440 } as const;

export function layoutClass(width: number): LayoutClass {
  if (width >= breakpoints.wide) return "wide";
  if (width >= breakpoints.desktop) return "desktop";
  if (width >= breakpoints.tablet) return "tablet";
  return "phone";
}

/** Columns of at least `minItem` px that fit in `width`, with `gap` between. */
export function fitColumns(width: number, minItem: number, gap = 0): number {
  return Math.max(1, Math.floor((width + gap) / (minItem + gap)));
}

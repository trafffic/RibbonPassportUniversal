export const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(value)));
export const isoToday = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function searchChoices<T extends { id: string; name: string }>(
  options: T[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => `${o.name} ${o.id}`.toLowerCase().includes(q));
}

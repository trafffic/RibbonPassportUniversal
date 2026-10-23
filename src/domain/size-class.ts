/** The iPhone size selector: Unknown (no value), Mini 0, Standard 128, Jumbo 255. */
export const sizeChoices = [
  { value: undefined, name: 'Unknown' },
  { value: 0, name: 'Mini' },
  { value: 128, name: 'Standard' },
  { value: 255, name: 'Jumbo' },
] as const;

export function sizeName(scale?: number): string {
  return sizeChoices.find((c) => c.value === scale)?.name ?? 'Unknown';
}

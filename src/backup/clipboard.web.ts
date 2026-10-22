export const canCopy =
  typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

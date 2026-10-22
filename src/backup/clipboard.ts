/** Copy text to the clipboard. Only the web build offers this. */
export const canCopy = false;
export async function copyText(_text: string): Promise<void> {
  throw new Error('Copying is not available on this device.');
}

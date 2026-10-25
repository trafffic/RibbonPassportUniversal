export async function loadPreference(key: string): Promise<string | null> {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
export async function savePreference(
  key: string,
  value: string,
): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {}
}
/** Drafts must surface storage failures instead of silently claiming protection. */
export async function writePreference(key: string, value: string): Promise<void> {
  if (!globalThis.localStorage) throw new Error('Local storage is unavailable.');
  globalThis.localStorage.setItem(key, value);
}

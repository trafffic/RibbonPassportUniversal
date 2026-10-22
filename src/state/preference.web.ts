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

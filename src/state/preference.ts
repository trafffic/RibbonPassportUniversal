import { File, Paths } from 'expo-file-system';

const file = (key: string) => new File(Paths.document, `pref-${encodeURIComponent(key)}.txt`);
export async function loadPreference(key: string): Promise<string | null> {
  try {
    const f = file(key);
    return f.exists ? await f.text() : null;
  } catch {
    return null;
  }
}
export async function savePreference(
  key: string,
  value: string,
): Promise<void> {
  try {
    const f = file(key);
    if (!f.exists) f.create();
    f.write(value);
  } catch {}
}
/** Drafts must surface storage failures instead of silently claiming protection. */
export async function writePreference(key: string, value: string): Promise<void> {
  const f = file(key);
  if (!f.exists) f.create();
  f.write(value);
}

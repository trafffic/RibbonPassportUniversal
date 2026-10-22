import { File, Paths } from 'expo-file-system';

const file = (key: string) => new File(Paths.document, `pref-${key}.txt`);
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

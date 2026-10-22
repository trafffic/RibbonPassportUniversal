import { File, Paths } from 'expo-file-system';
import { validPageSize } from '../domain/ribbon-view';

const file = () => new File(Paths.document, 'ribbons-page-size.txt');
export async function loadPageSize(): Promise<number> {
  try {
    const f = file();
    return f.exists ? validPageSize(Number(await f.text())) : 12;
  } catch {
    return 12;
  }
}
export async function savePageSize(size: number): Promise<void> {
  try {
    const f = file();
    if (!f.exists) f.create();
    f.write(String(size));
  } catch {}
}

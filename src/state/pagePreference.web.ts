import { validPageSize } from '../domain/ribbon-view';

const key = 'ribbons.pageSize';
export async function loadPageSize(): Promise<number> {
  try {
    return validPageSize(Number(globalThis.localStorage?.getItem(key)));
  } catch {
    return 12;
  }
}
export async function savePageSize(size: number): Promise<void> {
  try {
    globalThis.localStorage?.setItem(key, String(size));
  } catch {}
}

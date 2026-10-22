import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
export async function chooseBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return new File(result.assets[0]!.uri).text();
}
export async function saveBackup(text: string, name: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is unavailable on this device.');
  const file = new File(Paths.cache, name);
  await file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: name.endsWith('.txt') ? 'text/plain' : 'application/json',
    UTI: name.endsWith('.txt') ? 'public.plain-text' : 'public.json',
    dialogTitle: 'Export Ribbon Passport backup',
  });
}

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
export async function choosePhoto() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'image/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return new File(result.assets[0]!.uri).base64();
}

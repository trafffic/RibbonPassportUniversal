export async function chooseBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      try {
        resolve(input.files?.[0] ? await input.files[0].text() : null);
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
export async function saveBackup(text: string, name: string): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([text], {
      type: name.endsWith('.txt') ? 'text/plain' : 'application/json',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

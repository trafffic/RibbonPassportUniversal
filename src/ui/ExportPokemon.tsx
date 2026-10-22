import React, { useMemo, useState } from 'react';
import { useCollection } from '../state/CollectionProvider';
import { deletePokemon } from '../domain/passport';
import { exportSource } from '../backup/codec';
import { exportShowdown } from '../domain/showdown';
import { saveBackup } from '../backup/files';
import { canCopy, copyText } from '../backup/clipboard';
import { Button, PixelText } from './primitives';
const targets = {
  showdown: {
    name: 'Showdown',
    help: 'In Showdown’s Teambuilder, open Import/Export and paste this text.',
    save: 'Save text file',
    file: 'RibbonPassport-Pokemon.txt',
  },
  ribbons: {
    name: 'ribbons.guide',
    help: 'On ribbons.guide, open Settings → Data → Restore Backup. Restoring replaces the website’s collection with this file.',
    save: 'Save JSON file',
    file: 'RibbonPassport-Pokemon.json',
  },
};
export function ExportPokemon({ id }: { id: string }) {
  const { collection: c } = useCollection(),
    [message, setMessage] = useState(''),
    [target, setTarget] = useState<keyof typeof targets>(
      c?.records.find((r) => r.id === id)?.pokemon.showdownSet
        ? 'showdown'
        : 'ribbons',
    );
  const prepared = useMemo(() => {
    try {
      const p = c?.records.find((r) => r.id === id)?.pokemon;
      if (!c || !p) throw new Error('Pokémon not found.');
      if (target === 'showdown') return { text: exportShowdown([p]) };
      let single = c;
      for (const r of c.records)
        if (r.id !== id)
          single = deletePokemon(single, r.id, {
            id: 'export:' + r.id,
            at: new Date().toISOString(),
          });
      return { text: exportSource(single) };
    } catch (e) {
      return { text: '', error: e instanceof Error ? e.message : String(e) };
    }
  }, [c, id, target]);
  return (
    <>
      <PixelText>1 Pokémon</PixelText>
      {(Object.keys(targets) as (keyof typeof targets)[]).map((key) => (
        <Button
          key={key}
          primary={key === target}
          onPress={() => {
            setTarget(key);
            setMessage('');
          }}
        >
          {targets[key].name}
        </Button>
      ))}
      <PixelText>{targets[target].help}</PixelText>
      <Button
        disabled={!!prepared.error}
        onPress={async () => {
          try {
            await saveBackup(prepared.text, targets[target].file);
            setMessage('Export prepared.');
          } catch (e) {
            setMessage(String(e));
          }
        }}
      >
        {targets[target].save}
      </Button>
      {canCopy && (
        <Button
          disabled={!!prepared.error}
          onPress={async () => {
            try {
              await copyText(prepared.text);
              setMessage('Copied to the clipboard.');
            } catch (e) {
              setMessage('Could not copy. Use the file instead.');
            }
          }}
        >
          Copy to clipboard
        </Button>
      )}
      {!!(prepared.error || message) && (
        <PixelText accessibilityRole="alert">
          {prepared.error || message}
        </PixelText>
      )}
    </>
  );
}

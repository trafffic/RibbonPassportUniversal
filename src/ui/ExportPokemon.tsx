import React, { useState } from 'react';
import { useCollection } from '../state/CollectionProvider';
import { deletePokemon } from '../domain/passport';
import { exportSource } from '../backup/codec';
import { exportShowdown } from '../domain/showdown';
import { saveBackup } from '../backup/files';
import { Button, PixelText } from './primitives';
export function ExportPokemon({ id }: { id: string }) {
  const { collection: c } = useCollection(),
    [error, setError] = useState('');
  return (
    <>
      <PixelText>
        Export this Pokémon with its recorded history and supported original
        backup fields.
      </PixelText>
      <Button
        onPress={async () => {
          try {
            if (!c) return;
            const p = c.records.find((r) => r.id === id)?.pokemon;
            if (!p) throw new Error('Pokémon not found.');
            let single = c;
            for (const r of c.records)
              if (r.id !== id)
                single = deletePokemon(single, r.id, {
                  id: 'export:' + r.id,
                  at: new Date().toISOString(),
                });
            await saveBackup(
              p.showdownSet ? exportShowdown([p]) : exportSource(single),
              p.showdownSet
                ? 'RibbonPassport-Pokemon.txt'
                : 'RibbonPassport-Pokemon.json',
            );
            setError('Export prepared.');
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        Export this Pokémon
      </Button>
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
    </>
  );
}

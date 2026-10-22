import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { collectionStore } from '../src/storage';
import type { Collection } from '../src/domain/model';
import { useCollection } from '../src/state/CollectionProvider';
import { Shell } from '../src/ui/Shell';
import { Button, PixelText, Panel } from '../src/ui/primitives';
import { PageHeading } from '../src/ui/Community';
import { saveBackup } from '../src/backup/files';
import { exportUniversal } from '../src/backup/codec';
export default function Recovery() {
  const state = useCollection(),
    [history, setHistory] = useState<Collection[]>([]),
    [selected, setSelected] = useState<Collection | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    collectionStore
      .history()
      .then(setHistory)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <Shell>
      <PageHeading title="Recovery history" back="/settings" />
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {history.map((c, i) => (
        <Panel key={c.id + c.revision}>
          <PixelText>
            {c.records.length} Pokémon · {c.teams?.length ?? 0} teams
          </PixelText>
          <PixelText>{c.operations.at(-1)?.at || 'Saved collection'}</PixelText>
          <Button onPress={() => setSelected(c)}>
            Review saved version {String(i + 1)}
          </Button>
        </Panel>
      ))}
      {!history.length && !error && (
        <PixelText>No saved versions yet.</PixelText>
      )}
      {selected && (
        <Panel>
          <PixelText>
            Restore this collection with {selected.records.length} Pokémon? The
            current collection is archived before replacement.
          </PixelText>
          <Button
            disabled={state.busy}
            onPress={async () => {
              try {
                await saveBackup(
                  exportUniversal(selected),
                  'RibbonPassport-Recovery.json',
                );
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Export saved version
          </Button>
          <Button
            disabled={state.busy}
            primary
            onPress={async () => {
              if (await state.replace(selected)) setSelected(null);
            }}
          >
            Restore saved version
          </Button>
          <Button onPress={() => setSelected(null)}>Cancel</Button>
        </Panel>
      )}
    </Shell>
  );
}

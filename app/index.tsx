import React from 'react';
import { View } from 'react-native';
import { useCollection } from '../src/state/CollectionProvider';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
import { ClassicPassport, PokemonSummary } from '../src/ui/PokemonSummary';
import { useLayout } from '../src/ui/layout';
export default function CollectionScreen() {
  const { collection } = useCollection(),
    { width, isDesktop } = useLayout();
  const p =
    collection?.records.find(
      (r) => r.id === collection.selectedID && !r.pokemon.showdownSet,
    )?.pokemon ??
    collection?.records.find((r) => !r.pokemon.showdownSet)?.pokemon;
  const side = width >= 980;
  return (
    <Shell wide={isDesktop} studio={isDesktop && !!p}>
      <View
        testID={isDesktop ? 'classic-collection' : undefined}
        style={{
          flexDirection: side ? 'row' : 'column',
          gap: 24,
          alignItems: isDesktop ? 'stretch' : 'flex-start',
          flex: isDesktop ? 1 : undefined,
          minHeight: 0,
        }}
      >
        <View
          style={{
            flex: side ? 1 : undefined,
            width: side ? undefined : '100%',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <PCBox classic={isDesktop} />
        </View>
        {side && p && (
          <View style={{ width: isDesktop ? 340 : undefined, flex: isDesktop ? undefined : 1, minWidth: 0, minHeight: 0 }}>
            {isDesktop ? <ClassicPassport key={p.id} pokemon={p} /> : <PokemonSummary pokemon={p} />}
          </View>
        )}
      </View>
    </Shell>
  );
}

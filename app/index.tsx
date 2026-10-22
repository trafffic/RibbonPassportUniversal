import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useCollection } from '../src/state/CollectionProvider';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
import { PokemonSummary } from '../src/ui/PokemonSummary';
export default function CollectionScreen() {
  const { collection } = useCollection(),
    { width } = useWindowDimensions();
  const p =
    collection?.records.find(
      (r) => r.id === collection.selectedID && !r.pokemon.showdownSet,
    )?.pokemon ??
    collection?.records.find((r) => !r.pokemon.showdownSet)?.pokemon;
  return (
    <Shell>
      <View
        style={{
          flexDirection: width >= 980 ? 'row' : 'column',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            flex: width >= 980 ? 1.42 : undefined,
            width: width >= 980 ? undefined : '100%',
            minWidth: 0,
          }}
        >
          <PCBox />
        </View>
        {width >= 980 && p && (
          <View style={{ flex: 1, minWidth: 0, paddingTop: 87 }}>
            <PokemonSummary pokemon={p} />
          </View>
        )}
      </View>
    </Shell>
  );
}

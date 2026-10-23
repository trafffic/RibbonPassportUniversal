import React from 'react';
import { View } from 'react-native';
import { useCollection } from '../src/state/CollectionProvider';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
import { PokemonSummary } from '../src/ui/PokemonSummary';
import { RibbonStudio } from '../src/ui/Studio';
import { useLayout } from '../src/ui/layout';
export default function CollectionScreen() {
  const { collection } = useCollection(),
    { width, isDesktop } = useLayout();
  const p =
    collection?.records.find(
      (r) => r.id === collection.selectedID && !r.pokemon.showdownSet,
    )?.pokemon ??
    collection?.records.find((r) => !r.pokemon.showdownSet)?.pokemon;
  const empty = !collection?.records.some((r) => !r.pokemon.showdownSet);
  if (isDesktop && !empty)
    return (
      <Shell studio>
        <RibbonStudio />
      </Shell>
    );
  const side = width >= 980;
  return (
    <Shell>
      <View
        style={{
          flexDirection: side ? 'row' : 'column',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <View
          style={{
            flex: side ? 1.42 : undefined,
            width: side ? undefined : '100%',
            minWidth: 0,
          }}
        >
          <PCBox />
        </View>
        {side && p && (
          <View style={{ flex: 1, minWidth: 0 }}>
            <PokemonSummary pokemon={p} />
          </View>
        )}
      </View>
    </Shell>
  );
}

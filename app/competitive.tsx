import React from 'react';
import { Platform } from 'react-native';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
import { CompetitiveStudio } from '../src/ui/Studio';
import { useLayout } from '../src/ui/layout';
import { useCollection } from '../src/state/CollectionProvider';
export default function Competitive() {
  const { isDesktop, width } = useLayout(),
    { collection } = useCollection();
  const studio =
    isDesktop && !!collection?.records.some((r) => r.pokemon.showdownSet);
  return (
    <Shell studio>
      {studio ? <CompetitiveStudio /> : <PCBox kind="showdown" fit={Platform.OS === 'web' && width < 700} />}
    </Shell>
  );
}

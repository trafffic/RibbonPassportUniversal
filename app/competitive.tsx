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
  const populated = !!collection?.records.some((r) => r.pokemon.showdownSet);
  const studio = isDesktop && populated;
  return (
    <Shell studio={populated} landing={!populated}>
      {studio ? <CompetitiveStudio /> : <PCBox kind="showdown" fit={Platform.OS === 'web' && width < 700} />}
    </Shell>
  );
}

import React from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCollection } from '../../src/state/CollectionProvider';
import { passportLink, resolvePassportID } from '../../src/navigation/passport';
import { Shell } from '../../src/ui/Shell';
import { PCBox } from '../../src/ui/PCBox';
import { PassportPane } from '../../src/ui/PassportPane';
import { RibbonStudio } from '../../src/ui/Studio';
import { useLayout } from '../../src/ui/layout';
export default function PassportScreen() {
  const { id: routeID, tab } = useLocalSearchParams<{ id: string; tab: string }>(),
    { collection } = useCollection(),
    { width, isDesktop } = useLayout();
  const id = resolvePassportID(routeID, collection?.records ?? []) ?? routeID;
  const link = passportLink(id, collection?.records ?? [], tab);
  if (collection?.records.some((r) => r.id === id) &&
      (routeID !== link.params.id || tab === 'overview')) {
    return <Shell><Redirect href={link} /></Shell>;
  }
  if (isDesktop)
    return (
      <Shell wide studio>
        <RibbonStudio id={id} requested={tab} />
      </Shell>
    );
  return (
    <Shell>
      {width >= 980 ? (
        <View
          style={{ flexDirection: 'row', gap: 22, alignItems: 'flex-start' }}
        >
          <View style={{ width: 220 }}>
            <PCBox compact />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <PassportPane id={id} requested={tab} />
          </View>
        </View>
      ) : (
        <PassportPane id={id} requested={tab} />
      )}
    </Shell>
  );
}

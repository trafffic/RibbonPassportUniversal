import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { PCBox } from '../../src/ui/PCBox';
import { PassportPane } from '../../src/ui/PassportPane';
import { RibbonStudio } from '../../src/ui/Studio';
import { useLayout } from '../../src/ui/layout';
export default function PassportScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab: string }>(),
    { width, isDesktop } = useLayout();
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

import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { RecoveryItem } from '../../src/ui/Recovery';
export default function RecoveryItemScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  return (
    <Shell>
      <RecoveryItem key={`${kind}:${id}`} kind={kind} id={id} />
    </Shell>
  );
}

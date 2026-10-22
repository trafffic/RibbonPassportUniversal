import React from 'react';
import { Shell } from '../src/ui/Shell';
import { RecoveryHistory } from '../src/ui/Recovery';
export default function Recovery() {
  return (
    <Shell narrow>
      <RecoveryHistory />
    </Shell>
  );
}

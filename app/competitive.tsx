import React from 'react';
import { Shell } from '../src/ui/Shell';
import { PCBox } from '../src/ui/PCBox';
export default function Competitive() {
  return (
    <Shell>
      <PCBox kind="showdown" />
    </Shell>
  );
}

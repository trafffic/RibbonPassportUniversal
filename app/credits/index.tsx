import React from 'react';
import { useRouter } from 'expo-router';
import { Shell } from '../../src/ui/Shell';
import { PixelText } from '../../src/ui/primitives';
import { CommunityLink, PageHeading } from '../../src/ui/Community';
import { useTheme } from '../../src/ui/theme';
import licences from '../../assets/data/licences.json';

// Markdown links read as "text (address)"; the iPhone page renders them inline.
const plain = (md: string) =>
  md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/\*\*([^*]+)\*\*/g, '$1');

/** The iPhone "App credits" page: licence notices, then the app credits. */
export default function CreditsScreen() {
  const router = useRouter(),
    { ui } = useTheme();
  return (
    <Shell narrow>
      <PageHeading title="App credits" back="/settings" />
      {licences.notices.map((n) => (
        <CommunityLink
          key={n.name}
          title={n.name}
          subtitle="Licence notice"
          onPress={() =>
            router.push({ pathname: '/credits/[name]', params: { name: n.name } })
          }
        />
      ))}
      {licences.credits
        .split('\n\n')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) =>
          p.startsWith('#') ? (
            <PixelText key={i} style={ui.heading}>
              {p.replace(/^#+\s*/, '')}
            </PixelText>
          ) : (
            <PixelText key={i} selectable style={{ fontSize: 15 }}>
              {plain(p)}
            </PixelText>
          ),
        )}
    </Shell>
  );
}

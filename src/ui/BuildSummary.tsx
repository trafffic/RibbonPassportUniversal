import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pokemon, Team } from '../domain/model';
import { useTheme } from './theme';
import { Button, PixelText } from './primitives';
import { Build } from './Teams';

/** The selected build, as the iPhone build screen, inside the studio. */
export function BuildDetail({ pokemon: p }: { pokemon: Pokemon }) {
  return <Build key={p.id} id={p.id} embedded />;
}

/** Saved teams beside the competitive studio. */
export function TeamsRail({ teams }: { teams: Team[] }) {
  const router = useRouter(),
    { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <PixelText
        style={{ fontSize: 12, color: colors.muted, letterSpacing: 1 }}
      >
        TEAMS
      </PixelText>
      {teams.length ? (
        teams.map((t) => (
          <Button
            key={t.id}
            onPress={() =>
              router.push({
                pathname: '/teams/[id]',
                params: { id: t.id },
              } as never)
            }
          >
            {`${t.name} · ${t.memberIDs.length}`}
          </Button>
        ))
      ) : (
        <PixelText style={{ color: colors.muted }}>
          No teams yet. Import a Showdown team to start one.
        </PixelText>
      )}
      <Button onPress={() => router.push('/import-showdown')}>
        Import Showdown team
      </Button>
      <Button onPress={() => router.push('/library')}>Team library</Button>
    </View>
  );
}

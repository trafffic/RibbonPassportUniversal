import React from 'react';
import { View } from 'react-native';
import { awardName, earningLocation, gameName, generation, recordedVisits, sortAwards } from '../domain/catalog';
import type { Pokemon } from '../domain/model';
import { Art, Panel, PixelText, Tag } from './primitives';
import { colors, ui } from './theme';
export function Journey({ pokemon: p }: { pokemon: Pokemon }) {
  const visits = recordedVisits(p), unassigned = p.ribbons.filter(id => !p.earnedGames?.[id]);
  return <Panel>
    <View style={ui.between}><PixelText style={ui.heading}>The journey so far</PixelText><PixelText style={ui.label}>{visits.length} KNOWN STOPS</PixelText></View>
    <PixelText style={ui.muted}>Recorded visits, known origin, current game, and confirmed earning locations. Intermediate games are never guessed.</PixelText>
    {visits.length ? visits.map((visit, i) => {
      const awards = sortAwards(p.ribbons.filter(id => p.earnedGames?.[id] === visit.game));
      return <View key={visit.game} style={{ borderLeftWidth: 3, borderColor: colors.border, paddingLeft: 20, paddingBottom: 20, gap: 12 }}>
        <View style={ui.between}><View style={ui.row}><PixelText style={{ fontSize: 22 }}>{String(i + 1).padStart(2, '0')} / {gameName(visit.game)}</PixelText><Tag>{`Gen ${generation(visit.game) || '?'}`}</Tag></View><View style={ui.row}>{visit.game === p.origingame && <Tag>Origin</Tag>}{visit.game === p.currentgame && <Tag>Current</Tag>}</View></View>
        {awards.length ? awards.map(id => <View key={id} style={ui.row}><Art name={`award-${id}`} size={24} /><PixelText>{awardName(id)}</PixelText></View>) : <PixelText style={{ fontSize: 15, color: colors.muted }}>No ribbon has a confirmed earning location here.</PixelText>}
      </View>;
    }) : <PixelText>No visits recorded.</PixelText>}
    {!!unassigned.length && <View style={{ gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 20 }}>
      <PixelText style={{ fontSize: 23 }}>Earning game not recorded</PixelText>
      <PixelText style={{ fontSize: 16, color: colors.muted }}>Generation-only history remains generation-only. It is not assigned to a guessed game.</PixelText>
      {sortAwards(unassigned).map(id => <View key={id} style={ui.between}><PixelText>{awardName(id)}</PixelText><PixelText style={{ fontSize: 15, color: colors.muted }}>{earningLocation(p, id)}</PixelText></View>)}
    </View>}
  </Panel>;
}

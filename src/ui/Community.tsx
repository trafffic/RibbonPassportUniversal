import React, { useState } from 'react';
import { View, TextInput, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import {
  community,
  guidesFor,
  guideLocation,
  memberPokemon,
  copyCommunityTeam,
  type CommunityTeam,
  type FieldGuide,
} from '../domain/community';
import { awardName, gameName, sortGames } from '../domain/catalog';
import { updateMetadata } from '../domain/passport';
import { useCollection } from '../state/CollectionProvider';
import { useTheme } from './theme';
import { Art, Button, GameLabel, Panel, PixelText, Sprite } from './primitives';
import { ChoiceField, Field } from './Editors';
export function PageHeading({
  title,
  back = '/',
}: {
  title: string;
  back?: string;
}) {
  const router = useRouter(),
    { ui } = useTheme();
  return (
    <View style={ui.between}>
      <Button onPress={() => router.replace(back as never)}>← Back</Button>
      <PixelText accessibilityRole="header" style={ui.heading}>
        {title}
      </PixelText>
    </View>
  );
}
export function CommunityLink({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress(): void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        padding: 16,
        gap: 7,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.panel,
        minHeight: 60,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <PixelText style={{ fontSize: 20, flex: 1 }}>{title}</PixelText>
        <PixelText>›</PixelText>
      </View>
      {!!subtitle && (
        <PixelText style={{ fontSize: 14, color: colors.muted }}>
          {subtitle}
        </PixelText>
      )}
    </Pressable>
  );
}
export function FieldGuideLibrary({
  award = '',
  initialGame = '',
}: {
  award?: string;
  initialGame?: string;
}) {
  const { colors, ui } = useTheme(),
    router = useRouter();
  const [query, setQuery] = useState(''),
    [game, setGame] = useState(initialGame);
  const all = guidesFor(award || undefined),
    games = sortGames(all.flatMap((g) => g.gameIDs)),
    guides = all.filter(
      (g) =>
        (!game || g.gameIDs.includes(game)) &&
        (!query ||
          (g.title + ' ' + g.awardIDs.map(awardName).join(' '))
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
  return (
    <View style={{ gap: 16 }}>
      <PageHeading title="Field guides" />
      {!!award && (
        <View style={ui.row}>
          <Art name={'award-' + award} size={40} />
          <PixelText style={ui.heading}>{awardName(award)}</PixelText>
        </View>
      )}
      <ChoiceField
        label="Game"
        value={game}
        onChange={setGame}
        game
        options={[
          { id: '', name: 'All games' },
          ...games.map((id) => ({ id, name: gameName(id) })),
        ]}
      />
      <TextInput
        accessibilityLabel="Find a ribbon or guide"
        placeholder="Find a ribbon or guide"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
        style={ui.input}
      />
      {guides.map((g) => (
        <CommunityLink
          key={g.id}
          title={g.title}
          subtitle={`${g.steps.length} steps · ${g.sourceIDs.length} sources`}
          onPress={() =>
            router.push({
              pathname: '/guides/[id]',
              params: { id: g.id, game, award },
            })
          }
        />
      ))}
      {!guides.length && (
        <PixelText>
          {award
            ? 'There is no post-capture earning guide for this award. Event and capture-only awards keep their original descriptions.'
            : 'No guides match this search.'}
        </PixelText>
      )}
    </View>
  );
}
export function GuideDetail({
  id,
  initialGame = '',
  award = '',
}: {
  id: string;
  initialGame?: string;
  award?: string;
}) {
  const guide = community.guideModules.find((g) => g.id === id),
    { ui } = useTheme(),
    router = useRouter();
  const [selected, setSelected] = useState(initialGame),
    [chapter, setChapter] = useState('Steps');
  if (!guide) return <PixelText>Guide not found.</PixelText>;
  const game = guide.gameIDs.includes(selected)
      ? selected
      : (guide.gameIDs[0] ?? ''),
    location = guideLocation(guide, game),
    teams = community.teamCandidates.filter(
      (t) => guide.teamIDs?.includes(t.id) && t.gameIDs.includes(game),
    );
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Ribbon guide" back="/guides" />
      <PixelText style={ui.heading}>{guide.title}</PixelText>
      <ChoiceField
        label="Game"
        game
        value={game}
        onChange={setSelected}
        options={sortGames(guide.gameIDs).map((id) => ({
          id,
          name: gameName(id),
        }))}
      />
      <View style={ui.row}>
        {['Steps', 'Notes', 'Teams', 'Sources'].map((c) => (
          <Button key={c} primary={chapter === c} onPress={() => setChapter(c)}>
            {c}
          </Button>
        ))}
      </View>
      {chapter === 'Steps' ? (
        <>
          {guide.awardIDs
            .filter(
              (id) => (!award || award === id) && guide.requirements?.[id],
            )
            .map((id) => (
              <Panel key={id}>
                <View style={ui.row}>
                  <Art name={'award-' + id} size={30} />
                  <PixelText>{awardName(id)}</PixelText>
                </View>
                <PixelText>{guide.requirements![id]}</PixelText>
              </Panel>
            ))}
          {!!location && (
            <Panel>
              <GameLabel game={game} />
              <PixelText>{location}</PixelText>
            </Panel>
          )}
          {guide.steps.map((step, i) => (
            <Panel key={i}>
              <PixelText style={ui.label}>
                {String(i + 1).padStart(2, '0')}
              </PixelText>
              <PixelText>{step}</PixelText>
            </Panel>
          ))}
          <PixelText style={ui.muted}>
            Community summary · sources checked 16 Oct 2026
          </PixelText>
        </>
      ) : chapter === 'Notes' ? (
        <>
          {guide.cautions.map((c) => (
            <Panel key={c}>
              <PixelText>{c}</PixelText>
            </Panel>
          ))}
          {['fr-switch', 'lg-switch', 'xd-nso'].includes(game) && (
            <PixelText>
              This summary describes the original release. Check the linked
              source for differences in this release.
            </PixelText>
          )}
          {!guide.cautions.length && (
            <PixelText>No additional notes for this guide.</PixelText>
          )}
        </>
      ) : chapter === 'Teams' ? (
        <>
          {teams.map((t) => (
            <CommunityLink
              key={t.id}
              title={t.title}
              subtitle={`${t.format} · ${t.author}`}
              onPress={() =>
                router.push({
                  pathname: '/library/[id]',
                  params: { id: t.id, game },
                })
              }
            />
          ))}
          {!teams.length && (
            <PixelText>
              This guide has no battle team attached. Contest preparation is in
              Steps and the original sources.
            </PixelText>
          )}
        </>
      ) : (
        <SourceLinks ids={guide.sourceIDs} />
      )}
    </View>
  );
}
export function SourceLinks({ ids }: { ids: string[] }) {
  const router = useRouter();
  return (
    <View style={{ gap: 10 }}>
      {ids.map((id) => {
        const source = community.sources.find((s) => s.id === id);
        return source ? (
          <CommunityLink
            key={id}
            title={source.author}
            subtitle={source.title}
            onPress={() =>
              router.push({ pathname: '/sources/[id]', params: { id } })
            }
          />
        ) : null;
      })}
    </View>
  );
}
export function TeamLibrary() {
  const router = useRouter(),
    { colors, ui } = useTheme();
  const [game, setGame] = useState(''),
    [facility, setFacility] = useState(''),
    [query, setQuery] = useState('');
  const teams = community.teamCandidates.filter(
    (t) =>
      (!game || t.gameIDs.includes(game)) &&
      (!facility || t.facility === facility) &&
      (!query ||
        (t.title + ' ' + t.author + ' ' + t.format)
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  return (
    <View style={{ gap: 16 }}>
      <PageHeading title="Team library" back="/competitive" />
      <TextInput
        accessibilityLabel="Find a team or author"
        value={query}
        onChangeText={setQuery}
        style={ui.input}
        placeholder="Find a team or author"
        placeholderTextColor={colors.muted}
      />
      <ChoiceField
        label="Game"
        game
        value={game}
        onChange={setGame}
        options={[
          { id: '', name: 'All games' },
          ...sortGames(community.teamCandidates.flatMap((t) => t.gameIDs)).map(
            (id) => ({ id, name: gameName(id) }),
          ),
        ]}
      />
      <ChoiceField
        label="Facility"
        value={facility}
        onChange={setFacility}
        options={[
          { id: '', name: 'All facilities' },
          ...[...new Set(community.teamCandidates.map((t) => t.facility))]
            .sort()
            .map((id) => ({ id, name: id })),
        ]}
      />
      {teams.map((t) => (
        <Panel key={t.id}>
          <CommunityLink
            title={t.title}
            subtitle={`${t.facility} · ${t.format} · By ${t.author}`}
            onPress={() =>
              router.push({
                pathname: '/library/[id]',
                params: { id: t.id, game },
              })
            }
          />
          <View style={ui.row}>
            {t.members.map((m, i) => (
              <Sprite
                key={i}
                pokemon={memberPokemon(
                  m,
                  game || t.gameIDs[0]!,
                  `preview-${i}`,
                )}
                size={48}
              />
            ))}
          </View>
          <View style={ui.row}>
            {t.gameIDs.map((id) => (
              <GameLabel key={id} game={id} size={14} />
            ))}
          </View>
        </Panel>
      ))}
      {!teams.length && <PixelText>No teams match these filters.</PixelText>}
    </View>
  );
}
export function TeamDetail({
  id,
  initialGame = '',
}: {
  id: string;
  initialGame?: string;
}) {
  const state = useCollection(),
    router = useRouter(),
    { ui } = useTheme();
  const team = community.teamCandidates.find((t) => t.id === id);
  const [selection, setSelection] = useState(initialGame),
    [chapter, setChapter] = useState('Team'),
    [saved, setSaved] = useState('');
  if (!team) return <PixelText>Team not found.</PixelText>;
  const game = team.gameIDs.includes(selection) ? selection : team.gameIDs[0]!;
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Community team" back="/library" />
      <PixelText style={ui.heading}>{team.title}</PixelText>
      <PixelText>By {team.author}</PixelText>
      <PixelText style={ui.muted}>
        {team.facility} · {team.format}
      </PixelText>
      <ChoiceField
        label="Game"
        game
        value={game}
        onChange={setSelection}
        options={sortGames(team.gameIDs).map((id) => ({
          id,
          name: gameName(id),
        }))}
      />
      {saved ? (
        <>
          <PixelText>Personal copy saved</PixelText>
          <Button
            onPress={() =>
              router.push({ pathname: '/teams/[id]', params: { id: saved } })
            }
          >
            Open my copy
          </Button>
        </>
      ) : (
        <Button
          primary
          disabled={state.busy}
          onPress={async () => {
            const teamID = Crypto.randomUUID(),
              ids = {
                team: teamID,
                box: Crypto.randomUUID(),
                members: team.members.map(() => Crypto.randomUUID()),
              };
            if (
              await state.mutate(
                (c, ctx) => copyCommunityTeam(c, team, game, ids, ctx),
                'Personal copy saved on this device.',
              )
            )
              setSaved(teamID);
          }}
        >
          Save personal copy
        </Button>
      )}
      <View style={ui.row}>
        {['Team', 'Strategy', 'Sources'].map((c) => (
          <Button key={c} primary={chapter === c} onPress={() => setChapter(c)}>
            {c}
          </Button>
        ))}
      </View>
      {chapter === 'Team' ? (
        <>
          {team.members.map((m, i) => (
            <Panel key={i}>
              <View style={ui.row}>
                <Sprite
                  pokemon={memberPokemon(m, game, `preview-${i}`)}
                  size={54}
                />
                <View>
                  <PixelText style={ui.heading}>{m.species}</PixelText>
                  <PixelText>{m.item}</PixelText>
                </View>
              </View>
              <PixelText>
                {m.ability} · {m.nature}
              </PixelText>
              <PixelText>EVs · {m.evs}</PixelText>
              <PixelText>IVs · {m.ivs ?? 'Not specified by source'}</PixelText>
              {!!m.teraType && <PixelText>Tera · {m.teraType}</PixelText>}
              <View style={ui.row}>
                {m.moves.map((move) => (
                  <PixelText key={move} style={{ minWidth: '42%' }}>
                    {move}
                  </PixelText>
                ))}
              </View>
            </Panel>
          ))}
          {!!team.sourceVariantNote && (
            <PixelText>{team.sourceVariantNote}</PixelText>
          )}
        </>
      ) : chapter === 'Strategy' ? (
        <>
          <Panel>
            <PixelText>{team.strategySummary}</PixelText>
          </Panel>
          <PixelText style={ui.heading}>Ribbon Master slot</PixelText>
          <Panel>
            <PixelText>{team.ribbonMasterSlot.note}</PixelText>
          </Panel>
          {team.documentedResult && (
            <>
              <PixelText style={ui.heading}>Published result</PixelText>
              <PixelText>
                {team.documentedResult.wins
                  ? `${team.documentedResult.wins.toLocaleString()} published wins`
                  : (team.documentedResult.event ?? 'Community method')}
              </PixelText>
              <PixelText>{team.documentedResult.evidence}</PixelText>
            </>
          )}
          <PixelText>
            Source reviewed {team.checkedOn}. The published roster has not been
            playtested by this app. Rental codes are not supplied or checked
            live.
          </PixelText>
          {!!team.regulation && (
            <PixelText>
              Regulation {team.regulation}. Check current rules before entering
              Ranked Battles. A replacement Pokémon must fit the rules and team
              strategy.
            </PixelText>
          )}
        </>
      ) : (
        <SourceLinks ids={team.sourceIDs} />
      )}
    </View>
  );
}
export function SourceDetail({ id }: { id: string }) {
  const state = useCollection(),
    { ui } = useTheme(),
    source = community.sources.find((s) => s.id === id);
  const [note, setNote] = useState(state.collection?.sourceNotes?.[id] ?? ''),
    [saved, setSaved] = useState(false);
  if (!source) return <PixelText>Source not found.</PixelText>;
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Source" back="/guides" />
      <PixelText style={ui.heading}>{source.title}</PixelText>
      <PixelText>{source.author}</PixelText>
      <PixelText>Checked {source.checkedOn}</PixelText>
      <PixelText>
        {source.kind === 'official'
          ? 'Official source'
          : source.kind === 'app-assets'
            ? 'Artwork, data or font credit'
            : 'Community source · credit belongs to the original author'}
      </PixelText>
      {source.url.startsWith('https://') && (
        <Button onPress={() => Linking.openURL(source.url)}>
          Open original source ›
        </Button>
      )}
      <PixelText style={ui.heading}>My notes / correction</PixelText>
      <TextInput
        accessibilityLabel="Private note"
        multiline
        style={[ui.input, { minHeight: 140 }]}
        value={note}
        onChangeText={(v) => {
          setNote(v);
          setSaved(false);
        }}
      />
      <PixelText>
        Saved on this device. Nothing is sent to the author.
      </PixelText>
      <Button
        disabled={state.busy}
        primary
        onPress={async () => {
          if (
            await state.mutate((c, ctx) =>
              updateMetadata(
                c,
                { sourceNotes: { ...c.sourceNotes, [id]: note } },
                ctx,
              ),
            )
          )
            setSaved(true);
        }}
      >
        {saved ? 'Saved' : 'Save note'}
      </Button>
    </View>
  );
}

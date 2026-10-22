import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { updateMetadata, patchPassport } from '../domain/passport';
import {
  exportShowdown,
  parseShowdown,
  importShowdownTeam,
} from '../domain/showdown';
import { displayName, gameName, sortGames, ruleData } from '../domain/catalog';
import type { Pokemon, ShowdownSet, Team } from '../domain/model';
import { saveBackup } from '../backup/files';
import { useTheme } from './theme';
import { Button, PixelText, Panel, Sprite, GameLabel } from './primitives';
import { ChoiceField, EditorSheet, Field } from './Editors';
import { CommunityLink, PageHeading } from './Community';
export function Teams({ kind = 'showdown' }: { kind?: string }) {
  const state = useCollection(),
    router = useRouter(),
    { ui } = useTheme();
  const [editing, setEditing] = useState(false);
  const teams = (state.collection?.teams ?? []).filter((t) =>
    t.memberIDs.some((id) => {
      const p = state.collection?.records.find((r) => r.id === id)?.pokemon;
      return kind === 'showdown' ? !!p?.showdownSet : !p?.showdownSet;
    }),
  );
  return (
    <View style={{ gap: 18 }}>
      <PageHeading
        title={kind === 'showdown' ? 'Competitive teams' : 'Ribbon teams'}
        back={kind === 'showdown' ? '/competitive' : '/'}
      />
      <View style={ui.row}>
        <Button primary onPress={() => setEditing(true)}>
          Create team
        </Button>
        {kind === 'showdown' && (
          <Button onPress={() => router.push('/import-showdown')}>
            Import Showdown team
          </Button>
        )}
      </View>
      {teams.map((t) => (
        <CommunityLink
          key={t.id}
          title={t.name}
          subtitle={`${t.memberIDs.length} Pokémon`}
          onPress={() =>
            router.push({ pathname: '/teams/[id]', params: { id: t.id, kind } })
          }
        />
      ))}
      {!teams.length && <PixelText>No teams</PixelText>}
      {editing && <TeamEditor kind={kind} onClose={() => setEditing(false)} />}
    </View>
  );
}
export function TeamEditor({
  team,
  kind = 'showdown',
  onClose,
}: {
  team?: Team;
  kind?: string;
  onClose(): void;
}) {
  const state = useCollection(),
    { ui } = useTheme();
  const [name, setName] = useState(team?.name ?? ''),
    [members, setMembers] = useState(team?.memberIDs ?? []);
  const records = state.collection!.records.filter((r) =>
    kind === 'showdown' ? !!r.pokemon.showdownSet : !r.pokemon.showdownSet,
  );
  return (
    <EditorSheet title={team ? 'Edit team' : 'Create team'} onClose={onClose}>
      <Field label="Team name" value={name} onChange={setName} />
      <PixelText>Choose up to six Pokémon · tap in display order</PixelText>
      {records.map((r) => (
        <Button
          key={r.id}
          primary={members.includes(r.id)}
          disabled={!members.includes(r.id) && members.length >= 6}
          onPress={() =>
            setMembers(
              members.includes(r.id)
                ? members.filter((id) => id !== r.id)
                : [...members, r.id],
            )
          }
        >{`${members.includes(r.id) ? members.indexOf(r.id) + 1 + ' · ' : ''}${displayName(r.pokemon)}`}</Button>
      ))}
      <PixelText style={{ fontSize: 14 }}>
        Display order:{' '}
        {members
          .map((id) =>
            displayName(
              state.collection!.records.find((r) => r.id === id)!.pokemon,
            ),
          )
          .join(' → ')}
      </PixelText>
      <Button
        primary
        disabled={state.busy || !name.trim() || !members.length}
        onPress={async () => {
          const saved = {
            ...team,
            id: team?.id ?? Crypto.randomUUID(),
            name: name.trim(),
            memberIDs: members,
          };
          if (
            await state.mutate((c, ctx) =>
              updateMetadata(
                c,
                {
                  teams: team
                    ? (c.teams ?? []).map((t) => (t.id === team.id ? saved : t))
                    : [...(c.teams ?? []), saved],
                },
                ctx,
              ),
            )
          )
            onClose();
        }}
      >
        Save team
      </Button>
    </EditorSheet>
  );
}
export function PersonalTeam({ id }: { id: string }) {
  const state = useCollection(),
    router = useRouter(),
    { ui } = useTheme(),
    team = state.collection?.teams?.find((t) => t.id === id),
    [edit, setEdit] = useState(false),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState('');
  if (!team) return <PixelText>Team not found.</PixelText>;
  const members = team.memberIDs.flatMap(
      (id) => state.collection!.records.find((r) => r.id === id)?.pokemon ?? [],
    ),
    kind = members.some((p) => p.showdownSet) ? 'showdown' : 'ribbon';
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Team" back={`/teams?kind=${kind}`} />
      <PixelText style={ui.heading}>{team.name}</PixelText>
      <PixelText>{members.length} Pokémon</PixelText>
      <View style={ui.row}>
        <Button onPress={() => setEdit(true)}>Edit team</Button>
        <Button
          disabled={state.busy}
          onPress={() =>
            state.mutate((c, ctx) =>
              updateMetadata(c, { selectedTeamID: team.id }, ctx),
            )
          }
        >
          {state.collection?.selectedTeamID === team.id
            ? 'Default team ✓'
            : 'Use as default team'}
        </Button>
        {kind === 'showdown' && (
          <Button
            onPress={async () => {
              try {
                await saveBackup(
                  exportShowdown(members),
                  'RibbonPassport-Team.txt',
                );
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Export Showdown team
          </Button>
        )}
      </View>
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {members.map((p) => (
        <Panel key={p.id}>
          <View style={ui.row}>
            <Sprite pokemon={p} size={54} />
            <PixelText style={ui.heading}>{displayName(p)}</PixelText>
          </View>
          <GameLabel game={p.currentgame} />
          {p.showdownSet && (
            <>
              <PixelText>
                {p.showdownSet.item} · {p.showdownSet.ability}
              </PixelText>
              <PixelText>{p.showdownSet.moves.join(' / ')}</PixelText>
            </>
          )}
          <Button
            onPress={() =>
              router.push({
                pathname: p.showdownSet ? '/build/[id]' : '/passport/[id]',
                params: { id: p.id },
              } as never)
            }
          >
            {p.showdownSet ? 'Open build' : 'Open passport'}
          </Button>
        </Panel>
      ))}
      <Button onPress={() => setDeleting(true)}>Delete team</Button>
      {edit && (
        <TeamEditor team={team} kind={kind} onClose={() => setEdit(false)} />
      )}
      {deleting && (
        <EditorSheet title="Delete team" onClose={() => setDeleting(false)}>
          <PixelText>
            Delete {team.name}? Its Pokémon stay in storage.
          </PixelText>
          <Button
            disabled={state.busy}
            onPress={async () => {
              if (
                await state.mutate((c, ctx) =>
                  updateMetadata(
                    c,
                    { teams: (c.teams ?? []).filter((t) => t.id !== id) },
                    ctx,
                  ),
                )
              )
                router.replace('/competitive');
            }}
          >
            Delete team
          </Button>
        </EditorSheet>
      )}
    </View>
  );
}
export function Build({ id }: { id: string }) {
  const state = useCollection(),
    { ui } = useTheme(),
    r = state.collection?.records.find((r) => r.id === id),
    [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  if (!r) return <PixelText>Pokémon not found.</PixelText>;
  const p = r.pokemon,
    b = p.showdownSet;
  if (!b)
    return <PixelText>No battle build recorded for this Pokémon.</PixelText>;
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Build" back="/competitive" />
      <View style={ui.row}>
        <Sprite pokemon={p} size={70} />
        <View>
          <PixelText style={ui.heading}>{displayName(p)}</PixelText>
          <PixelText>Lv. {p.currentlevel}</PixelText>
        </View>
      </View>
      <GameLabel game={p.currentgame} />
      {[
        ['Item', b.item],
        ['Ability', b.ability],
        ['Nature', b.nature],
        ['Tera type', b.teraType],
        ['EVs', b.evs],
        ['IVs', b.ivs],
      ].map(([key, val]) => (
        <Panel key={key}>
          <PixelText style={ui.label}>{key}</PixelText>
          <PixelText>{val || 'Not set'}</PixelText>
        </Panel>
      ))}
      <PixelText style={ui.heading}>Moves</PixelText>
      {b.moves.map((move, i) => (
        <PixelText key={i}>{move}</PixelText>
      ))}
      <View style={ui.row}>
        <Button onPress={() => setEditing(true)}>Edit build</Button>
        <Button
          onPress={async () => {
            try {
              await saveBackup(
                exportShowdown([p]),
                'RibbonPassport-Pokemon.txt',
              );
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Export
        </Button>
      </View>
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {editing && (
        <BuildEditor
          pokemon={p}
          expected={r.version.revision}
          onClose={() => setEditing(false)}
        />
      )}
    </View>
  );
}
function BuildEditor({
  pokemon: p,
  expected,
  onClose,
}: {
  pokemon: Pokemon;
  expected: string;
  onClose(): void;
}) {
  const state = useCollection();
  const [draft, setDraft] = useState<ShowdownSet>({ ...p.showdownSet! }),
    [moves, setMoves] = useState(p.showdownSet!.moves.join('\n')),
    [error, setError] = useState('');
  const { ui } = useTheme();
  return (
    <EditorSheet title="Edit build" onClose={onClose}>
      {(['item', 'ability', 'nature', 'teraType', 'evs', 'ivs'] as const).map(
        (key) => (
          <Field
            key={key}
            label={
              {
                item: 'Item',
                ability: 'Ability',
                nature: 'Nature',
                teraType: 'Tera type',
                evs: 'EVs',
                ivs: 'IVs',
              }[key]
            }
            value={draft[key]}
            onChange={(v) => setDraft({ ...draft, [key]: v })}
          />
        ),
      )}
      <PixelText>Moves · one per line</PixelText>
      <TextInput
        accessibilityLabel="Moves"
        multiline
        style={[ui.input, { minHeight: 120 }]}
        value={moves}
        onChangeText={setMoves}
      />
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      <Button
        primary
        disabled={state.busy}
        onPress={async () => {
          const list = moves
            .split(/\n|\s*\/\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (list.length > 4) {
            setError('Choose up to four moves.');
            return;
          }
          if (
            await state.mutate((c, ctx) =>
              patchPassport(
                c,
                p.id,
                { showdownSet: { ...draft, moves: list } },
                expected,
                ctx,
              ),
            )
          )
            onClose();
        }}
      >
        Save build
      </Button>
    </EditorSheet>
  );
}
export function ShowdownImport() {
  const state = useCollection(),
    router = useRouter(),
    { colors, ui } = useTheme();
  const [name, setName] = useState(''),
    [text, setText] = useState(''),
    [game, setGame] = useState(''),
    [origin, setOrigin] = useState(''),
    [error, setError] = useState('');
  const games = [
    { id: '', name: 'Not set' },
    ...sortGames(Object.keys(ruleData.games)).map((id) => ({
      id,
      name: gameName(id),
    })),
  ];
  return (
    <View style={{ gap: 18 }}>
      <PageHeading title="Import Showdown team" back="/competitive" />
      <Field label="Team name" value={name} onChange={setName} />
      <TextInput
        accessibilityLabel="Showdown export"
        multiline
        style={[ui.input, { minHeight: 240 }]}
        value={text}
        onChangeText={setText}
        placeholder="Paste one Showdown team · 1–6 Pokémon"
        placeholderTextColor={colors.muted}
      />
      <ChoiceField
        label="Origin game"
        game
        value={origin}
        onChange={setOrigin}
        options={games}
      />
      <ChoiceField
        label="Current game"
        game
        value={game}
        onChange={setGame}
        options={games}
      />
      <PixelText>
        Showdown exports have no ribbons, marks or origin games. New Pokémon
        start with zero awards.
      </PixelText>
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      <Button
        primary
        disabled={state.busy || !name.trim() || !text.trim()}
        onPress={async () => {
          try {
            const blocks = text
              .replace(/\r\n?/g, '\n')
              .split('\n')
              .filter((l) => !l.trim().startsWith('==='))
              .join('\n')
              .trim()
              .split(/\n\s*\n/)
              .filter(Boolean);
            const pokemon = parseShowdown(
                text,
                blocks.map(() => Crypto.randomUUID()),
                game,
                origin,
              ),
              id = Crypto.randomUUID(),
              box = Crypto.randomUUID();
            if (
              await state.mutate((c, ctx) =>
                importShowdownTeam(c, pokemon, name, id, box, ctx),
              )
            )
              router.replace({ pathname: '/teams/[id]', params: { id } });
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      >
        Import team
      </Button>
    </View>
  );
}

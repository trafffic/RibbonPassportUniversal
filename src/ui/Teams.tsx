import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { patchPassport, updateMetadata } from '../domain/passport';
import {
  applyTeamVersion,
  deleteTeam,
  diffTeamVersion,
  editTeamVersion,
  exportTeamVersion,
  moveMember,
  removeTeamVersion,
  saveTeam,
  saveTeamVersion,
  teamVersions,
  toggleMember,
} from '../domain/teams';
import {
  exportShowdown,
  parseShowdown,
  importShowdownTeam,
} from '../domain/showdown';
import { displayName, gameName, sortGames, ruleData } from '../domain/catalog';
import {
  applyBuildVersion,
  diffBuild,
  exportBuildVersion,
  removeBuildVersion,
  saveBuildVersion,
  savedBuilds,
} from '../domain/build-notebook';
import type { Pokemon, ShowdownSet, Team, TeamBuild } from '../domain/model';
import { saveBackup } from '../backup/files';
import { useTheme } from './theme';
import { Button, PixelText, Panel, Sprite, GameLabel } from './primitives';
import { ChoiceField, EditorSheet, Field } from './Editors';
import { CommunityLink, PageHeading } from './Community';
function useRun() {
  const [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const run = async (
    work: () => Promise<boolean | void> | boolean | void,
    done: string,
  ) => {
    setError('');
    setMessage('');
    try {
      if ((await work()) !== false) setMessage(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return { message, error, run };
}
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
    [members, setMembers] = useState(team?.memberIDs ?? []),
    [choosing, setChoosing] = useState(false);
  const records = state.collection!.records.filter((r) =>
    kind === 'showdown' ? !!r.pokemon.showdownSet : !r.pokemon.showdownSet,
  );
  const arranged = members.flatMap((id) => {
    const p = state.collection!.records.find((r) => r.id === id)?.pokemon;
    return p ? [p] : [];
  });
  return (
    <EditorSheet title={team ? 'Edit team' : 'Create team'} onClose={onClose}>
      <Field label="Team name" value={name} onChange={setName} />
      <PixelText style={ui.heading}>
        Display order · {arranged.length} / 6
      </PixelText>
      {arranged.map((p, i) => (
        <Panel key={p.id}>
          <View style={ui.row}>
            <PixelText>{i + 1}</PixelText>
            <Sprite pokemon={p} size={44} />
            <PixelText style={{ flex: 1 }}>{displayName(p)}</PixelText>
            <Button
              label={`Move ${displayName(p)} up`}
              disabled={i === 0}
              onPress={() => setMembers(moveMember(members, i, -1))}
            >
              ↑
            </Button>
            <Button
              label={`Move ${displayName(p)} down`}
              disabled={i === arranged.length - 1}
              onPress={() => setMembers(moveMember(members, i, 1))}
            >
              ↓
            </Button>
            <Button
              label={`Remove ${displayName(p)}`}
              onPress={() => setMembers(toggleMember(members, p.id))}
            >
              ×
            </Button>
          </View>
        </Panel>
      ))}
      <Button onPress={() => setChoosing(!choosing)}>
        {choosing ? 'Done choosing' : 'Choose members'}
      </Button>
      {choosing && (
        <>
          <PixelText>Choose up to six Pokémon · tap to add or remove</PixelText>
          {records.map((r) => (
            <Button
              key={r.id}
              label={`Member ${displayName(r.pokemon)}`}
              primary={members.includes(r.id)}
              disabled={!members.includes(r.id) && members.length >= 6}
              onPress={() => setMembers(toggleMember(members, r.id))}
            >{`${members.includes(r.id) ? members.indexOf(r.id) + 1 + ' · ' : ''}${displayName(r.pokemon)}`}</Button>
          ))}
        </>
      )}
      <Button
        primary
        disabled={state.busy || !name.trim() || !arranged.length}
        onPress={async () => {
          const saved = {
            ...team,
            id: team?.id ?? Crypto.randomUUID(),
            name: name.trim(),
            memberIDs: arranged.map((p) => p.id),
          };
          if (await state.mutate((c, ctx) => saveTeam(c, saved, ctx)))
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
      {kind === 'showdown' && <TeamNotebook team={team} />}
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
              if (await state.mutate((c, ctx) => deleteTeam(c, id, ctx)))
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
function TeamNotebook({ team }: { team: Team }) {
  const state = useCollection(),
    { ui } = useTheme(),
    [name, setName] = useState(''),
    [note, setNote] = useState(''),
    [editing, setEditing] = useState<TeamBuild>(),
    { message, error, run } = useRun();
  return (
    <View style={{ gap: 12 }}>
      <PixelText style={ui.heading}>Build notebook</PixelText>
      <PixelText>Named team versions</PixelText>
      <Field label="Version name" value={name} onChange={setName} />
      <Field label="Version notes (optional)" value={note} onChange={setNote} />
      <Button
        primary
        disabled={state.busy || !name.trim()}
        onPress={() =>
          run(async () => {
            if (
              !(await state.mutate((c, ctx) =>
                saveTeamVersion(
                  c,
                  team.id,
                  { id: Crypto.randomUUID(), name, note },
                  ctx,
                ),
              ))
            )
              return false;
            setName('');
            setNote('');
          }, 'Version saved')
        }
      >
        Save current build
      </Button>
      {!!message && <PixelText accessibilityRole="alert">{message}</PixelText>}
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {teamVersions(team).map((v) => {
        const differing = diffTeamVersion(state.collection!, team, v);
        return (
          <Panel key={v.id}>
            <PixelText style={ui.heading}>{v.name}</PixelText>
            {!!v.note && <PixelText>{v.note}</PixelText>}
            <PixelText>
              {`${differing} ${differing === 1 ? 'build differs' : 'builds differ'} from current team`}
            </PixelText>
            {v.members.map((m) => (
              <PixelText key={m.id}>
                {m.nickname || m.species} · {m.build.item}
              </PixelText>
            ))}
            <View style={ui.row}>
              <Button
                label={`Apply ${v.name}`}
                disabled={state.busy}
                onPress={() =>
                  run(
                    () =>
                      state.mutate(
                        (c, ctx) => applyTeamVersion(c, team.id, v.id, ctx),
                        'Team version applied. You can undo this change.',
                      ),
                    'Team version applied',
                  )
                }
              >
                Apply
              </Button>
              <Button label={`Notes ${v.name}`} onPress={() => setEditing(v)}>
                Notes
              </Button>
              <Button
                label={`Export ${v.name}`}
                onPress={() =>
                  run(
                    () =>
                      saveBackup(
                        exportTeamVersion(v),
                        'RibbonPassport-Team.txt',
                      ),
                    'Version exported',
                  )
                }
              >
                Export
              </Button>
              <Button
                label={`Remove ${v.name}`}
                disabled={state.busy}
                onPress={() =>
                  run(
                    () =>
                      state.mutate((c, ctx) =>
                        removeTeamVersion(c, team.id, v.id, ctx),
                      ),
                    'Version removed',
                  )
                }
              >
                Remove
              </Button>
            </View>
          </Panel>
        );
      })}
      {editing && (
        <TeamVersionNotes
          teamID={team.id}
          version={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </View>
  );
}
function TeamVersionNotes({
  teamID,
  version,
  onClose,
}: {
  teamID: string;
  version: TeamBuild;
  onClose(): void;
}) {
  const state = useCollection(),
    { ui } = useTheme(),
    [name, setName] = useState(version.name),
    [note, setNote] = useState(version.note);
  return (
    <EditorSheet title="Version notes" onClose={onClose}>
      <Field label="Version name" value={name} onChange={setName} />
      <PixelText>Version notes</PixelText>
      <TextInput
        accessibilityLabel="Version notes"
        multiline
        style={[ui.input, { minHeight: 140 }]}
        value={note}
        onChangeText={setNote}
      />
      <Button
        primary
        disabled={state.busy || !name.trim()}
        onPress={async () => {
          if (
            await state.mutate((c, ctx) =>
              editTeamVersion(c, teamID, version.id, { name, note }, ctx),
            )
          )
            onClose();
        }}
      >
        Save notes
      </Button>
    </EditorSheet>
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
      <BuildNotebook pokemon={p} expected={r.version.revision} />
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
function BuildNotebook({
  pokemon: p,
  expected,
}: {
  pokemon: Pokemon;
  expected: string;
}) {
  const state = useCollection(),
    { ui } = useTheme(),
    [name, setName] = useState(''),
    [note, setNote] = useState(''),
    [open, setOpen] = useState(''),
    { message, error, run } = useRun(),
    versions = savedBuilds(p),
    current = p.showdownSet!;
  return (
    <View style={{ gap: 12 }}>
      <PixelText style={ui.heading}>Build notebook</PixelText>
      <Field label="Version name" value={name} onChange={setName} />
      <Field label="Version notes (optional)" value={note} onChange={setNote} />
      <Button
        primary
        disabled={state.busy || !name.trim()}
        onPress={() =>
          run(async () => {
            if (
              !(await state.mutate((c, ctx) =>
                saveBuildVersion(
                  c,
                  p.id,
                  { id: Crypto.randomUUID(), name, note },
                  expected,
                  ctx,
                ),
              ))
            )
              return false;
            setName('');
            setNote('');
          }, 'Version saved')
        }
      >
        Save current build
      </Button>
      {!!message && <PixelText accessibilityRole="alert">{message}</PixelText>}
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {!versions.length && (
        <PixelText>
          No saved versions yet. Name the current build to keep it here.
        </PixelText>
      )}
      {versions.map((v) => {
        const differences = diffBuild(v.build, current);
        return (
          <Panel key={v.id}>
            <PixelText style={ui.heading}>{v.name}</PixelText>
            {!!v.note && <PixelText>{v.note}</PixelText>}
            <PixelText>
              {!differences.length
                ? 'Matches current build'
                : `${differences.length} ${differences.length === 1 ? 'field differs' : 'fields differ'} from current build`}
            </PixelText>
            {open === v.id &&
              differences.map((d) => (
                <PixelText key={d.label}>
                  {d.label}: {d.saved || 'Not set'} → {d.current || 'Not set'}
                </PixelText>
              ))}
            <View style={ui.row}>
              <Button
                label={`Compare ${v.name}`}
                onPress={() => setOpen(open === v.id ? '' : v.id)}
              >
                {open === v.id ? 'Hide diff' : 'Diff'}
              </Button>
              <Button
                label={`Apply ${v.name}`}
                disabled={state.busy}
                onPress={() =>
                  run(
                    () =>
                      state.mutate(
                        (c, ctx) =>
                          applyBuildVersion(c, p.id, v.id, expected, ctx),
                        'Version applied. You can undo this change.',
                      ),
                    'Version applied',
                  )
                }
              >
                Apply
              </Button>
              <Button
                label={`Export ${v.name}`}
                onPress={() =>
                  run(
                    () =>
                      saveBackup(
                        exportBuildVersion(p, v.id),
                        'RibbonPassport-Build.txt',
                      ),
                    'Version exported',
                  )
                }
              >
                Export Showdown
              </Button>
              <Button
                label={`Remove ${v.name}`}
                disabled={state.busy}
                onPress={() =>
                  run(
                    () =>
                      state.mutate((c, ctx) =>
                        removeBuildVersion(c, p.id, v.id, expected, ctx),
                      ),
                    'Version removed',
                  )
                }
              >
                Remove
              </Button>
            </View>
          </Panel>
        );
      })}
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

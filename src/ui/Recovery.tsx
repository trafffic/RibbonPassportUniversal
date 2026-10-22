import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { collectionStore } from '../storage';
import type { Collection } from '../domain/model';
import {
  actionName,
  containsItem,
  currentName,
  matchesVersion,
  recoveryChanges,
  recoveryKey,
  sectionName,
  totalLimit,
  versionsPerItem,
  type RecoveryEntry,
} from '../domain/recovery';
import { awardName, gameName } from '../domain/catalog';
import { useCollection } from '../state/CollectionProvider';
import { saveBackup } from '../backup/files';
import { exportUniversal } from '../backup/codec';
import { useTheme } from './theme';
import { Art, Button, Panel, PixelText, Sprite } from './primitives';
import { PageHeading } from './Community';

const stamp = (iso: string, seconds = false) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(seconds ? { second: '2-digit' } : {}),
      });
};
function useRecovery() {
  const { collection } = useCollection(),
    revision = collection?.revision;
  const [state, setState] = useState<{
    entries: RecoveryEntry[];
    archives: Collection[];
    loading: boolean;
    error: string;
  }>({ entries: [], archives: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    Promise.all([collectionStore.recovery(), collectionStore.history()])
      .then(([entries, archives]) => {
        if (active) setState({ entries, archives, loading: false, error: '' });
      })
      .catch((e) => {
        if (active)
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
          }));
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return state;
}
function Artwork({ entry, size }: { entry: RecoveryEntry; size: number }) {
  if (entry.kind === 'pokemon')
    return <Sprite pokemon={entry.snapshot.pokemon} size={size} />;
  return <Art name="award-winning-ribbon" size={size * 0.7} />;
}
function Empty({ title }: { title: string }) {
  return (
    <Panel>
      <PixelText accessibilityRole="header" style={{ fontSize: 22 }}>
        {title}
      </PixelText>
      <PixelText>Saved edits and deletions appear here from now on.</PixelText>
    </Panel>
  );
}
const filters = ['All', 'Deleted', 'Versions'] as const;
export function RecoveryHistory() {
  const router = useRouter(),
    state = useCollection(),
    { colors } = useTheme(),
    { entries, archives, loading, error } = useRecovery();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All'),
    [archive, setArchive] = useState<Collection | null>(null),
    [problem, setProblem] = useState('');
  const c = state.collection;
  const seen = new Set<string>();
  const items = entries.filter((e) => {
    if (seen.has(recoveryKey(e))) return false;
    seen.add(recoveryKey(e));
    const exists = !!c && containsItem(c, e);
    return filter === 'All' || (filter === 'Deleted' ? !exists : exists);
  });
  return (
    <>
      <PageHeading title="Recovery history" back="/settings" />
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Recovery filters"
        style={{ flexDirection: 'row', gap: 6 }}
      >
        {filters.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="tab"
            accessibilityLabel={f}
            accessibilityState={{ selected: filter === f }}
            onPress={() => setFilter(f)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: filter === f ? colors.board : colors.panel,
            }}
          >
            <PixelText style={{ fontSize: 16 }}>{f}</PixelText>
          </Pressable>
        ))}
      </View>
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {!!problem && <PixelText accessibilityRole="alert">{problem}</PixelText>}
      {loading ? (
        <PixelText accessibilityRole="progressbar">
          Loading saved versions…
        </PixelText>
      ) : (
        <>
          {!items.length && !error && (
            <Empty
              title={
                filter === 'Deleted'
                  ? 'No deleted items'
                  : 'No saved versions yet'
              }
            />
          )}
          {items.map((e) => {
            const exists = !!c && containsItem(c, e);
            return (
              <Pressable
                key={recoveryKey(e)}
                accessibilityRole="button"
                accessibilityLabel={`Saved versions for ${c ? currentName(c, e) : e.name}`}
                onPress={() =>
                  router.push({
                    pathname: '/recovery/item',
                    params: { kind: e.kind, id: e.objectID },
                  })
                }
              >
                <Panel
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <Artwork entry={e} size={48} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <PixelText style={{ fontSize: 19 }}>
                      {c ? currentName(c, e) : e.name}
                    </PixelText>
                    <PixelText style={{ fontSize: 13, color: colors.muted }}>
                      {exists ? 'Saved versions' : 'Deleted'} ·{' '}
                      {sectionName(e.section)}
                    </PixelText>
                    <PixelText style={{ fontSize: 13, color: colors.muted }}>
                      {stamp(e.recordedAt)}
                    </PixelText>
                  </View>
                </Panel>
              </Pressable>
            );
          })}
          {filter === 'All' &&
            archives.map((a, i) => (
              <Panel key={a.id + a.revision}>
                <PixelText style={{ fontSize: 19 }}>
                  Collection archive
                </PixelText>
                <PixelText style={{ color: colors.muted }}>
                  {a.records.length} Pokémon · {a.teams?.length ?? 0} teams ·{' '}
                  {a.operations.at(-1)?.at
                    ? stamp(a.operations.at(-1)!.at)
                    : 'Saved collection'}
                </PixelText>
                <Button onPress={() => setArchive(a)}>
                  {`Review collection archive ${i + 1}`}
                </Button>
              </Panel>
            ))}
        </>
      )}
      {archive && (
        <Panel>
          <PixelText>
            Restore this collection with {archive.records.length} Pokémon? The
            current collection is archived before replacement.
          </PixelText>
          <Button
            disabled={state.busy}
            onPress={async () => {
              try {
                await saveBackup(
                  exportUniversal(archive),
                  'RibbonPassport-Recovery.json',
                );
              } catch (e) {
                setProblem(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Export collection archive
          </Button>
          <Button
            disabled={state.busy}
            primary
            onPress={async () => {
              if (await state.replace(archive)) setArchive(null);
            }}
          >
            Restore collection archive
          </Button>
          <Button onPress={() => setArchive(null)}>Cancel</Button>
        </Panel>
      )}
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        On this device · Up to {versionsPerItem} versions per Pokémon or team,{' '}
        {totalLimit} total. Oldest versions are removed when full.
      </PixelText>
    </>
  );
}
export function RecoveryItem({ kind, id }: { kind: string; id: string }) {
  const { colors } = useTheme(),
    state = useCollection(),
    { entries, loading, error } = useRecovery();
  const [selected, setSelected] = useState<RecoveryEntry | null>(null);
  const versions = entries.filter((e) => e.kind === kind && e.objectID === id);
  const c = state.collection;
  if (selected && c)
    return (
      <RecoveryVersion entry={selected} onBack={() => setSelected(null)} />
    );
  const first = versions[0];
  return (
    <>
      <PageHeading title="Saved versions" back="/recovery" />
      {!!error && <PixelText accessibilityRole="alert">{error}</PixelText>}
      {loading ? (
        <PixelText accessibilityRole="progressbar">
          Loading saved versions…
        </PixelText>
      ) : first && c ? (
        <>
          <Panel
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
          >
            <Artwork entry={first} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <PixelText style={{ fontSize: 22 }}>{first.name}</PixelText>
              <PixelText style={{ color: colors.muted }}>
                {containsItem(c, first)
                  ? 'Choose a saved version'
                  : 'Deleted · Choose a version to recover'}
              </PixelText>
            </View>
          </Panel>
          {versions.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${actionName[e.action]} ${stamp(e.recordedAt, true)}`}
              onPress={() => setSelected(e)}
            >
              <Panel style={{ gap: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <PixelText style={{ fontSize: 18 }}>
                    {actionName[e.action]}
                  </PixelText>
                  {matchesVersion(c, e) && (
                    <PixelText style={{ fontSize: 13, color: colors.accent }}>
                      Current
                    </PixelText>
                  )}
                </View>
                <PixelText style={{ fontSize: 13, color: colors.muted }}>
                  {stamp(e.recordedAt, true)}
                </PixelText>
              </Panel>
            </Pressable>
          ))}
        </>
      ) : (
        !error && (
          <PixelText>
            No saved versions yet. History starts with the next saved edit or
            deletion.
          </PixelText>
        )
      )}
    </>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
    >
      <PixelText>{label}</PixelText>
      <PixelText style={{ flexShrink: 1, textAlign: 'right' }}>
        {value || 'Not set'}
      </PixelText>
    </View>
  );
}
function RecoveryVersion({
  entry,
  onBack,
}: {
  entry: RecoveryEntry;
  onBack: () => void;
}) {
  const { colors } = useTheme(),
    state = useCollection(),
    c = state.collection!;
  const [restored, setRestored] = useState(false),
    [details, setDetails] = useState(false);
  const current = matchesVersion(c, entry),
    exists = containsItem(c, entry),
    changes = recoveryChanges(c, entry);
  const p = entry.kind === 'pokemon' ? entry.snapshot.pokemon : null;
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button onPress={onBack}>← Back</Button>
        <PixelText accessibilityRole="header" style={{ fontSize: 20 }}>
          Preview version
        </PixelText>
      </View>
      <Panel style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Artwork entry={entry} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <PixelText style={{ fontSize: 22 }}>{entry.name}</PixelText>
          <PixelText style={{ color: colors.muted }}>
            {actionName[entry.action]}
          </PixelText>
          <PixelText style={{ fontSize: 13, color: colors.muted }}>
            {stamp(entry.recordedAt, true)}
          </PixelText>
        </View>
      </Panel>
      {!!changes.length && (
        <Panel>
          <PixelText accessibilityRole="header" style={{ fontSize: 18 }}>
            What will change
          </PixelText>
          {changes.map((line) => (
            <PixelText key={line}>{line}</PixelText>
          ))}
        </Panel>
      )}
      {!!state.error && (
        <PixelText accessibilityRole="alert">{state.error}</PixelText>
      )}
      <Button
        primary
        disabled={current || state.busy}
        onPress={async () => setRestored(await state.restoreVersion(entry))}
      >
        {current
          ? 'Current version'
          : exists
            ? 'Restore this version'
            : entry.kind === 'pokemon'
              ? 'Recover Pokémon'
              : 'Recover team'}
      </Button>
      {restored && (
        <PixelText accessibilityRole="alert" style={{ color: colors.accent }}>
          Restored
        </PixelText>
      )}
      <PixelText style={{ fontSize: 13, color: colors.muted }}>
        {entry.kind === 'pokemon' && !exists
          ? 'The original position and team memberships are used where space is available. Occupied slots stay in place.'
          : 'The details being replaced will stay in Recovery history.'}
      </PixelText>
      <Button onPress={() => setDetails(!details)}>
        {details ? 'Hide saved details' : 'Saved details'}
      </Button>
      {details && p && (
        <Panel>
          <Row label="Species" value={p.species} />
          <Row label="Nickname" value={p.nickname} />
          <Row label="Level" value={String(p.currentlevel)} />
          <Row label="Current game" value={gameName(p.currentgame)} />
          <Row label="Origin game" value={gameName(p.origingame)} />
          <Row label="Shiny" value={p.shiny ? 'Yes' : 'No'} />
          <Row label="Equipped title" value={p.titleText || p.title} />
          <Row
            label={`Ribbons and marks · ${p.ribbons.length}`}
            value={p.ribbons.map(awardName).join(', ')}
          />
          {p.showdownSet && (
            <Row label="Moves" value={p.showdownSet.moves.join(' / ')} />
          )}
        </Panel>
      )}
      {details && entry.kind === 'team' && (
        <Panel>
          {entry.snapshot.memberIDs.map((id) => {
            const member =
              entry.members.find((m) => m.id === id) ??
              c.records.find((r) => r.id === id)?.pokemon;
            return (
              <Row
                key={id}
                label={
                  member?.nickname || member?.species || 'Unavailable Pokémon'
                }
                value={c.records.some((r) => r.id === id) ? '' : 'Missing'}
              />
            );
          })}
          <PixelText style={{ fontSize: 13, color: colors.muted }}>
            Only members still in your collection and in this section will be
            included. Recover missing Pokémon first to restore the full team.
          </PixelText>
        </Panel>
      )}
    </>
  );
}

import React, { useState } from 'react';
import { Image, View, TextInput } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useCollection } from '../state/CollectionProvider';
import { patchPassport } from '../domain/passport';
import { community } from '../domain/community';
import {
  catalog,
  displayName,
  recordedVisits,
  ruleData,
  sortGames,
  gameName,
} from '../domain/catalog';
import type { Honor, Memory, MoveNote, Pokemon } from '../domain/model';
import { choosePhoto } from '../backup/photos';
import { useTheme } from './theme';
import { Button, PixelText, Panel, GameLabel } from './primitives';
import { ChoiceField, Field, EditorSheet } from './Editors';
import { PageHeading } from './Community';
export function Notebook({
  id,
  initialSection = 'Memories',
}: {
  id: string;
  initialSection?: string;
}) {
  const state = useCollection(),
    { colors, ui } = useTheme(),
    record = state.collection?.records.find((r) => r.id === id),
    p = record?.pokemon;
  const [section, setSection] = useState(initialSection),
    [draft, setDraft] = useState<Honor | Memory | MoveNote | null>(null),
    [photoError, setPhotoError] = useState('');
  if (!p || !record) return <PixelText>Pokémon not found.</PixelText>;
  const list =
      section === 'Milestones'
        ? (p.honors ?? [])
        : section === 'Move Dex'
          ? (p.moveNotes ?? [])
          : (p.journal ?? []),
    field =
      section === 'Milestones'
        ? 'honors'
        : section === 'Move Dex'
          ? 'moveNotes'
          : 'journal';
  const gameOptions = [
    { id: '', name: 'Not set' },
    ...sortGames(Object.keys(ruleData.games)).map((id) => ({
      id,
      name: gameName(id),
    })),
  ];
  const save = async (remove = false) => {
    if (!draft) return;
    const rows = remove
      ? list.filter((r) => r.id !== draft.id)
      : list.some((r) => r.id === draft.id)
        ? list.map((r) => (r.id === draft.id ? draft : r))
        : [...list, draft];
    if (
      await state.mutate((c, ctx) =>
        patchPassport(c, id, { [field]: rows }, record.version.revision, ctx),
      )
    )
      setDraft(null);
  };
  const update = (patch: Record<string, unknown>) =>
    setDraft((old) => ({ ...old, ...patch }) as typeof old);
  return (
    <View style={{ gap: 18 }}>
      <PageHeading
        title={section === 'visits' ? 'Edit visits' : section}
        back={`/passport/${id}?tab=journey`}
      />
      <PixelText style={ui.heading}>{displayName(p)}</PixelText>
      {section === 'visits' ? (
        <>
          <PixelText>
            Choose the games you have actually visited. Origin, current game and
            confirmed earning locations remain known stops.
          </PixelText>
          {sortGames([
            ...Object.keys(ruleData.games),
            ...(p.visits ?? []).map((v) => v.game),
          ]).map((game) => {
            const known = [
                p.origingame,
                p.currentgame,
                ...Object.values(p.earnedGames ?? {}),
              ].includes(game),
              visited = recordedVisits(p).some((v) => v.game === game);
            return (
              <View key={game} style={ui.between}>
                <GameLabel game={game} />
                <Button
                  disabled={state.busy || known}
                  primary={visited}
                  onPress={() =>
                    state.mutate((c, ctx) =>
                      patchPassport(
                        c,
                        id,
                        {
                          visits: visited
                            ? (p.visits ?? []).filter((v) => v.game !== game)
                            : [
                                ...(p.visits ?? []),
                                { id: Crypto.randomUUID(), game },
                              ],
                        },
                        record.version.revision,
                        ctx,
                      ),
                    )
                  }
                >
                  {known ? 'Known stop' : visited ? 'Visited ✓' : 'Add visit'}
                </Button>
              </View>
            );
          })}
        </>
      ) : (
        <>
          <View style={ui.row}>
            {['Milestones', 'Memories', 'Move Dex'].map((tab) => (
              <Button
                key={tab}
                primary={section === tab}
                onPress={() => setSection(tab)}
              >
                {tab}
              </Button>
            ))}
          </View>
          {section === 'Move Dex' && (
            <PixelText>
              Record moves and games you have checked in HOME. These notes are
              manual and do not affect Ribbon Master completion.
            </PixelText>
          )}
          <Button
            primary
            onPress={() => {
              const base = { id: Crypto.randomUUID(), game: p.currentgame };
              setDraft(
                section === 'Milestones'
                  ? {
                      ...base,
                      catalogID: 'custom',
                      title: '',
                      earned: true,
                      date: '',
                      note: '',
                      trainerMilestone: false,
                    }
                  : section === 'Move Dex'
                    ? { ...base, move: '', note: '', homeChecked: false }
                    : { ...base, title: '', date: '', text: '' },
              );
            }}
          >
            {section === 'Milestones'
              ? 'Add milestone'
              : section === 'Move Dex'
                ? 'Add move note'
                : 'Add memory'}
          </Button>
          {!list.length && (
            <PixelText>
              {section === 'Milestones'
                ? 'No milestones recorded yet.'
                : section === 'Move Dex'
                  ? 'No Move Dex notes recorded yet.'
                  : 'No memories recorded yet.'}
            </PixelText>
          )}
          {[...list].reverse().map((entry) => (
            <Panel key={entry.id}>
              <Button onPress={() => setDraft(entry)}>
                {'title' in entry ? entry.title : entry.move}
              </Button>
              <GameLabel game={entry.game} />
              {'date' in entry && !!entry.date && (
                <PixelText>{entry.date}</PixelText>
              )}
              <PixelText>{'text' in entry ? entry.text : entry.note}</PixelText>
              {'photo' in entry && !!entry.photo && (
                <Image
                  source={{ uri: 'data:image/jpeg;base64,' + entry.photo }}
                  resizeMode="contain"
                  style={{ width: '100%', height: 180 }}
                />
              )}
            </Panel>
          ))}
        </>
      )}
      {draft && (
        <EditorSheet
          title={
            section === 'Milestones'
              ? 'Milestone'
              : section === 'Move Dex'
                ? 'Move Dex note'
                : 'Memory'
          }
          onClose={() => setDraft(null)}
        >
          {'catalogID' in draft && (
            <ChoiceField
              label="Milestone"
              value={draft.catalogID}
              onChange={(value) => {
                const d = community.honorDefinitions.find(
                  (h) => h.id === value,
                );
                update({
                  catalogID: value,
                  title: d?.title ?? draft.title,
                  trainerMilestone: d?.trainerMilestone ?? false,
                });
              }}
              options={[
                { id: 'custom', name: 'Custom' },
                ...community.honorDefinitions.map((h) => ({
                  id: h.id,
                  name: h.title,
                })),
              ]}
            />
          )}
          <Field
            label={'title' in draft ? 'Title' : 'Move'}
            value={'title' in draft ? draft.title : draft.move}
            onChange={(value) =>
              update('title' in draft ? { title: value } : { move: value })
            }
          />
          <ChoiceField
            label="Game"
            game
            value={draft.game}
            options={gameOptions}
            onChange={(game) => update({ game })}
          />
          {'date' in draft && (
            <Field
              label="Date (YYYY-MM-DD)"
              value={draft.date}
              onChange={(date) => update({ date })}
            />
          )}
          <TextInput
            accessibilityLabel={section === 'Memories' ? 'Your memory' : 'Note'}
            multiline
            style={[ui.input, { minHeight: 140 }]}
            value={'text' in draft ? draft.text : draft.note}
            onChangeText={(value) =>
              update('text' in draft ? { text: value } : { note: value })
            }
          />
          {'homeChecked' in draft && (
            <Button
              primary={draft.homeChecked}
              onPress={() => update({ homeChecked: !draft.homeChecked })}
            >
              {draft.homeChecked ? 'HOME checked ✓' : 'Not checked in HOME'}
            </Button>
          )}
          {'earned' in draft && (
            <Button
              primary={draft.earned}
              onPress={() => update({ earned: !draft.earned })}
            >
              {draft.earned ? 'Earned ✓' : 'Not earned'}
            </Button>
          )}
          {'title' in draft && (
            <>
              <Button
                onPress={async () => {
                  try {
                    const photo = await choosePhoto();
                    if (photo) update({ photo });
                  } catch (e) {
                    setPhotoError(String(e));
                  }
                }}
              >
                Choose photo
              </Button>
              {!!draft.photo && (
                <>
                  <Image
                    source={{ uri: 'data:image/jpeg;base64,' + draft.photo }}
                    resizeMode="contain"
                    style={{ width: '100%', height: 180 }}
                  />
                  <Button onPress={() => update({ photo: '' })}>
                    Remove photo
                  </Button>
                </>
              )}
            </>
          )}
          {!!photoError && (
            <PixelText accessibilityRole="alert">{photoError}</PixelText>
          )}
          <Button
            primary
            disabled={
              state.busy ||
              !('title' in draft ? draft.title : draft.move).trim()
            }
            onPress={() => save()}
          >
            Save{' '}
            {section === 'Milestones'
              ? 'milestone'
              : section === 'Move Dex'
                ? 'move note'
                : 'memory'}
          </Button>
          {list.some((r) => r.id === draft.id) && (
            <Button disabled={state.busy} onPress={() => save(true)}>
              Remove entry
            </Button>
          )}
        </EditorSheet>
      )}
    </View>
  );
}

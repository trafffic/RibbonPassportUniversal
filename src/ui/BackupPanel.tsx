import React, { useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { exportSource, exportUniversal, importBackup } from '../backup/codec';
import { chooseBackup, saveBackup } from '../backup/files';
import type { Collection } from '../domain/model';
import { Panel, PixelText, Button } from './primitives';
import { ui, colors } from './theme';

export function BackupPanel({ onClose }: { onClose: () => void }) {
  const state = useCollection();
  const router = useRouter();
  const [pending, setPending] = useState<Collection | null>(null), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setWorking(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not read or save the backup.'); }
    finally { setWorking(false); }
  };
  const disabled = state.busy || working || !!state.conflict;
  return <Panel>
    <View style={ui.between}><PixelText style={ui.heading}>Take your collection with you</PixelText><Button onPress={onClose}>Close</Button></View>
    <PixelText>Import a Ribbon Passport app backup, a ribbons.guide version 5 backup, or a universal collection. Unknown fields and attachments are kept.</PixelText>
    <View style={ui.row}>
      <Button disabled={disabled} primary onPress={() => run(async () => { const text = await chooseBackup(); if (text !== null) setPending(importBackup(text, Crypto.randomUUID(), Crypto.randomUUID())); })}>Choose backup file</Button>
      <Button disabled={disabled || !state.collection} onPress={() => run(async () => { await saveBackup(exportUniversal(state.collection!), 'RibbonPassport-Universal.json'); setMessage('Universal backup prepared. It includes your full collection and original backup.'); })}>Export collection</Button>
      <Button disabled={disabled || !state.collection} onPress={() => run(async () => { await saveBackup(exportSource(state.collection!), state.collection!.source.kind === 'guide' ? 'RibbonBackup.json' : 'RibbonPassport-App.json'); setMessage('Original-format backup prepared. Existing fields, Pokémon edits and box changes are retained. Keep a universal backup for full local history.'); })}>Export original format</Button>
    </View>
    <PixelText style={{ fontSize: 15, color: colors.muted }}>Universal backups preserve local history and revisions. App-format exports include box layouts. Guide-format exports include box names and assignments plus an extension for exact slots, party and wallpapers; ribbons.guide ignores this extension. Other apps may ignore added earning history.</PixelText>
    {state.conflict && <View style={ui.row}>
      <Button onPress={() => run(() => saveBackup(exportUniversal(state.conflict!.ours), 'RibbonPassport-this-window.json'))}>Export this window’s version</Button>
      <Button onPress={() => run(() => saveBackup(exportUniversal(state.conflict!.theirs), 'RibbonPassport-other-window.json'))}>Export other window’s version</Button>
    </View>}
    {pending && <View style={{ gap: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 }}>
      <PixelText style={{ fontSize: 23 }}>{pending.records.length} Pokémon · {pending.boxes.length} boxes</PixelText>
      <PixelText>This replaces the collection shown here. Your current collection is archived locally and you can undo the import.</PixelText>
      <View style={ui.row}><Button disabled={disabled} primary onPress={async () => { if (await state.replace(pending)) { setPending(null); onClose(); router.replace('/'); } }}>Replace collection</Button><Button onPress={() => setPending(null)}>Cancel import</Button></View>
    </View>}
    {!!error && <PixelText accessibilityRole="alert" style={{ color: colors.warningInk }}>{error}</PixelText>}
    {!!message && <PixelText accessibilityLiveRegion="polite">{message}</PixelText>}
  </Panel>;
}

import React, { useState } from 'react';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useCollection } from '../state/CollectionProvider';
import { colors, ui } from './theme';
import { Button, Panel, PixelText } from './primitives';
import { BackupPanel } from './BackupPanel';

export function Shell({ children }: React.PropsWithChildren) {
  const router = useRouter(), path = usePathname(), { width } = useWindowDimensions();
  const state = useCollection();
  const [backups, setBackups] = useState(false);
  return <View style={ui.page}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ backgroundColor: colors.panel, borderBottomWidth: 2, borderColor: colors.ink }}>
        <View style={[ui.between, { width: '100%', maxWidth: 1400, alignSelf: 'center', paddingHorizontal: width < 600 ? 16 : 24, paddingVertical: 16 }]}>
          <View style={[ui.row, width < 800 && { width: '100%' }]}>
            <Image source={require('../../assets/icon.png')} style={{ width: 40, height: 40 }} />
            <View style={{ flexShrink: 1, minWidth: 0 }}><PixelText style={{ fontSize: 23 }}>Ribbon Passport</PixelText><PixelText style={ui.label}>YOUR COLLECTION. YOUR JOURNEY.</PixelText></View>
          </View>
          <View style={[ui.row, { gap: 8 }, width < 800 && { width: '100%' }]}>
            <Button primary={path === '/'} onPress={() => router.push('/')}>Collection</Button>
            <Button primary={path === '/planner'} onPress={() => router.push('/planner')}>Ribbon planner</Button>
            <Button onPress={() => setBackups(!backups)}>{backups ? 'Close backups' : 'Import / export'}</Button>
          </View>
        </View>
      </View>
      <View style={[ui.content, width < 600 && { padding: 16, gap: 18 }]}>
        {backups && <BackupPanel onClose={() => setBackups(false)} />}
        {!!state.error && <Panel style={{ backgroundColor: colors.warning }}><PixelText accessibilityRole="alert" style={{ color: colors.warningInk }}>{state.error}</PixelText>{state.collection && !state.conflict && <Button onPress={state.dismissError}>Dismiss</Button>}</Panel>}
        {state.conflict && <Panel>
          <PixelText style={ui.heading}>Choose a saved version</PixelText>
          <PixelText>Another window edited this collection. Export both copies before choosing the version to continue editing.</PixelText>
          <View style={ui.row}><Button onPress={() => state.resolveConflict('ours')} disabled={state.busy}>Keep this window’s version</Button><Button onPress={() => state.resolveConflict('theirs')} disabled={state.busy}>Keep other window’s version</Button></View>
        </Panel>}
        {state.busy && !state.collection ? <PixelText>Opening your collection…</PixelText> : state.collection ? children : !state.error && <PixelText>Opening local storage…</PixelText>}
        {(!!state.notice || state.canUndo) && <View accessibilityLiveRegion="polite" style={[ui.between, { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, padding: 14 }]}>
          <PixelText>{state.notice || 'Your last change can be undone.'}</PixelText>
          {state.canUndo && <Button disabled={state.busy} onPress={state.undo}>Undo last change</Button>}
        </View>}
        <View style={[ui.between, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 18, marginTop: 8, paddingBottom: 16 }]}>
          <PixelText style={{ fontSize: 14, color: colors.muted }}>LOCAL COLLECTION  /  {state.busy ? 'Saving…' : state.error ? 'Save needs attention' : state.collection ? 'Saved on this device' : 'Storage unavailable'}{state.collection?.id === 'sample-collection-v1' ? '  /  Sample Pokémon' : ''}</PixelText>
          <PixelText style={{ fontSize: 13, color: colors.muted }}>An unofficial Pokémon fan project</PixelText>
        </View>
      </View>
    </ScrollView>
  </View>;
}

import React, { useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { backupContent } from '../domain/collection-tools';
import type { Collection } from '../domain/model';
import { loadPreference, writePreference } from '../state/preference';
import { PixelText } from './primitives';
import { useTheme } from './theme';

export async function noteCollectionExport(c: Collection): Promise<void> {
  const fingerprint = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, backupContent(c));
  await writePreference(`backup.${c.id}`, JSON.stringify({ fingerprint, at: new Date().toISOString() }));
}
export function BackupStatus({ collection: c, refresh = '' }: { collection: Collection; refresh?: string }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState('Checking backup status…');
  const content = useMemo(() => backupContent(c), [c.records, c.boxes, c.partyIDs, c.teams, c.sourceNotes, c.appearance, c.source, c.deletedSourceIndexes]);
  useEffect(() => {
    let active = true;
    (async () => {
      let message = 'No full collection export recorded on this device.';
      try {
        const raw = await loadPreference(`backup.${c.id}`);
        const stamp = raw ? JSON.parse(raw) : null;
        if (typeof stamp?.fingerprint === 'string' && typeof stamp?.at === 'string' && !isNaN(Date.parse(stamp.at))) {
          const fingerprint = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
          message = `Last full collection export prepared: ${new Date(stamp.at).toLocaleString()}. ${fingerprint === stamp.fingerprint ? 'Collection matches that export.' : 'Changes since that export — prepare a new backup.'}`;
        }
      } catch { message = 'Backup status is unavailable on this device.'; }
      if (active) setStatus(message);
    })();
    return () => { active = false; };
  }, [content, c.id, refresh]);
  return <PixelText testID="backup-status" style={{ fontSize: 13, color: colors.muted }}>{status}</PixelText>;
}

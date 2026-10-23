type RecordID = { id: string };

// A stable display alias only: storage and backups keep the original IDs.
function shortID(id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

export function passportRouteID(id: string, records: readonly RecordID[]): string {
  const alias = shortID(id);
  // Ambiguous aliases fall back to the original ID rather than opening another record.
  return records.some((r) => r.id !== id && (r.id === alias || shortID(r.id) === alias))
    ? id
    : alias;
}

export function resolvePassportID(routeID: string, records: readonly RecordID[]): string | undefined {
  return records.find((r) => r.id === routeID)?.id ??
    records.find((r) => shortID(r.id) === routeID && passportRouteID(r.id, records) === routeID)?.id;
}

export function passportLink(id: string, records: readonly RecordID[], tab?: string) {
  return {
    pathname: '/passport/[id]' as const,
    params: {
      id: passportRouteID(id, records),
      ...(tab && tab !== 'overview' ? { tab } : {}),
    },
  };
}

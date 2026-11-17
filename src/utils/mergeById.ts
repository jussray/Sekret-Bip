/**
 * mergeById
 * Generic cloud/local merge helper used in the Supabase pullAll sync effect.
 *
 * Strategy:
 *   - Cloud rows take precedence on id collision
 *   - Local-only rows (id not in cloud) are appended
 *   - Result is sorted newest-first by id (numeric or timestamp-based)
 *
 * Previously inlined in the useEffect inside app/index.tsx.
 * Now reusable across useAppEffects and any future sync hooks.
 */
export function mergeById<T extends { id: number | string }>(local: T[], remote: T[]): T[] {
  const remoteIds = new Set(remote.map((r) => r.id));
  const localExtras = local.filter((l) => !remoteIds.has(l.id));
  return [...remote, ...localExtras];
}

/**
 * mergeByIdSorted
 * Same as mergeById but sorts the result descending by numeric id.
 * Use when the consumer expects newest-first ordering (journal, mood history, etc.).
 */
export function mergeByIdSorted<T extends { id: number | string }>(local: T[], remote: T[]): T[] {
  const merged = mergeById(local, remote);
  return merged.sort((a, b) => Number(b.id) - Number(a.id));
}

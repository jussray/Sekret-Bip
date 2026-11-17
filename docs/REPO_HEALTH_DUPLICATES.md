# Repository Duplicate Audit

Six unused root utility placeholders were removed:

- `utils/sekretCompanion.ts`
- `utils/sekretReply.ts`
- `utils/storage.ts`
- `utils/supabase.ts`
- `utils/sync.ts`
- `utils/voiceCompanion.ts`

The real implementations remain under `src/utils/`.

Identical Supabase migration marker files were retained because their timestamped filenames preserve migration history. Matching `index.ts` files under parent, shared, and teen domains were also retained because they are intentional module barrels, not competing implementations.

No other exact duplicate text or source implementations were found by the checksum audit. Binary and media assets were excluded and require a separate reference-aware audit before deletion.

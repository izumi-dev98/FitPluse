# Fitness_Frontend agent instructions

## Data fetching — TanStack Query + zustand (mandatory style)

- NEVER call `apiClient.get*` directly in components/pages. All reads go
  through shared hooks in `src/lib/queries.ts` so every screen shares one
  cache entry per resource.
- To add a new read endpoint:
  1. Add the fetcher to `apiClient` in `src/lib/api.ts` (payloads typed as
     `ApiBody`, never `any`).
  2. Add a key to the `qk` factory in `src/lib/queries.ts`:
     `['resource', uid]` (+ params, e.g. `['daily-foods', uid, recordId]`).
  3. Add a hook via `useArr<T>(key, fetcher, uid)` with the generated row
     type from `src/lib/database.ts` (e.g. `useArr<Goal>(...)`). Queries are
     gated by `enabled: !!uid` with shared `STALE_TIME`/`GC_TIME`.
- Writes stay as direct `apiClient.create/update/delete` calls in event
  handlers, then invalidate: `useInvalidateDaily()` for daily-log data,
  or `qc.invalidateQueries({ queryKey: qk.<resource>(uid) })` for catalogs.
  Prefix invalidation covers parameterized keys. Never hand-roll reload
  functions (`loadX` + `setState`) — that pattern is fully removed.
- `ensureTodayRecord(qc, uid)` (in `queries.ts`) is the only way to
  get-or-create today's `daily_records` row; it reuses the cached query.
- User id comes from `useAuthStore((s) => s.user)?.id`. Tokens are attached
  and refreshed inside `src/lib/api.ts` — components never touch tokens.
- No `any` anywhere: DB rows use the aliases in `src/lib/database.ts`
  (regenerate it from Supabase MCP after schema changes); backend-enriched
  fields use the `*Row` extensions there. Catches use `unknown` +
  `instanceof Error` narrowing.

## UI conventions

- Visual authority is `design.md` (tokens, color jobs, component recipes,
  layout, copy, accessibility). This file does not define colors or
  typography — follow `design.md` for all className work, with
  `GoalsPage.tsx` as the reference implementation.
- Numbers via `fmtInt()` in `src/lib/format.ts`; age derives from `dob`
  via `ageFromDob()` — never store or input raw age.
- Check `src/lib/database.ts` relationship comments before joining data
  client-side; prefer backend-joined fields already exposed on `*Row` types.

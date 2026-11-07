# Performance audit · v2.1.1

## Implemented

- Loading boundaries cover the dashboard, character and campaign sheets,
  settings, play table and TV display. A shared gold compass wheel appears only
  after the top loading bar finishes if page content is still pending. It fades
  in and out, respects reduced motion and leaves fast navigation free of extra
  indicators. The header has its own Suspense boundary, so inbox queries do not
  hold the page behind them.
- Character sheets fetch containers across campaigns in one query, retaining
  campaign filters, explicit columns, RLS and character-specific access checks.
  The linked database's query plan uses `containers_campaign_idx` for the batch;
  no additional index or migration is needed.
- Item and spell detail caches share pending requests as well as completed
  results. Failed requests leave the cache so the next search can retry.
  These caches contain public SRD data only.
- Table refreshes have a 15-second timeout. A failed read releases the shared
  request queue so subsequent changes can still arrive.
- Dice Pouch animation code loads when a pouch is opened. Additional map
  thumbnails use lazy loading and asynchronous decoding.
- OpenTelemetry registers on Node.js Vercel instances or when an OTLP collector
  is configured. Speed Insights is available behind an explicit deployment flag.
- Dice appearance is live table state. Authoritative party and campaign reads
  update the roller and skin preloads; appearance changes and returning seats
  notify other chairs to re-read those values, including TV displays. Broadcast
  payloads never supply trusted appearance values. Health-only changes keep
  dice subscriptions stable, and failed speculative preloads are contained.
- Background simulation loads in a separate chunk during idle time. Drawing
  skips frames without a simulation step, hidden tabs suspend their loop and
  grain, and backing stores are capped at the equivalent of 1080p at 2× density.
  Resize snapshots and retired buffers are released immediately. Reduced-motion
  tables skip all 3D dice-world warm-up work.

## Monitoring setup

Enable [Speed Insights](https://vercel.com/docs/speed-insights/quickstart) for the
Vercel project, set the server-side configuration variable
`SPEED_INSIGHTS_ENABLED=true` in the intended deployment environment, then
redeploy. The default is off, including local development. Review LCP, INP and
CLS by route and device after collecting real traffic.

Server spans register under `grimoire-tales` through
[`@vercel/otel`](https://vercel.com/docs/tracing/instrumentation). Vercel provides
the trace destination. Outside Vercel, supply `OTEL_EXPORTER_OTLP_ENDPOINT` or
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and any collector authentication through
server-side environment variables. Trace delivery requires a running collector;
local builds alone cannot verify production ingestion.

## Already present

| Requested optimization         | Current implementation                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WebP/AVIF and lazy images      | Next Image serves WebP by default; uploads and painted scenes are re-encoded, and existing avatars and map cards load lazily. WebP avoids adding AVIF cold-encoding latency and another cache variant. |
| Debounced search               | Character, item and spell searches debounce input and abort superseded requests.                                                                                                                       |
| Duplicate-call prevention      | Request-scoped React caches share auth and metadata/page reads; live table events gather into scoped reads.                                                                                            |
| Bounded results and pagination | Searches cap SRD results, notifications and activity are limited, and party exports page inventory reads. Character and campaign lists have database-enforced limits.                                  |
| Parallel requests              | Dashboard, sheet, table, export and painter loaders already run independent reads together.                                                                                                            |
| Optimistic updates             | Table state updates before writes return and reconciles failures; notifications use optimistic state.                                                                                                  |
| Select only needed columns     | Sina owns explicit select lists and strips ownership identifiers from shared results.                                                                                                                  |
| Indexes                        | Existing migrations cover campaign, character, container, map, notification and activity lookup paths. The new batch uses the existing campaign index.                                                 |
| Static caching and CDN         | Hashed imports and Next static assets are cacheable; immutable storage uploads already carry long cache lifetimes. Vercel supplies CDN delivery.                                                       |
| Compression                    | Vercel compresses at the edge. The documented local Next gzip worker issue is why `compress: false` remains intentional.                                                                               |
| SSR and JavaScript splitting   | Pages render on the server; Next splits routes, edit dialogs load dynamically, and dice-box enters through the shared lazy loader.                                                                     |
| Fonts                          | `next/font` self-hosts the Latin variable fonts.                                                                                                                                                       |
| API timeouts                   | SRD, Google token, Vertex and scene-image fetches already have deadlines.                                                                                                                              |
| Re-renders                     | Table state has scoped subscriptions; callbacks and derived collections already use memoization where needed.                                                                                          |
| Dependencies                   | Each existing direct dependency has a runtime, build, lint, test or database-tooling use; none was safely removable.                                                                                   |

## Decisions requiring workload or deployment evidence

- Redis would add another service and invalidation path. Public SRD fetches
  already use Next's persistent cache; mutable, permission-sensitive table data
  stays fresh through scoped reads and realtime. No Redis cache was added.
- Virtualization would complicate keyboard interaction and variable-height
  panels. Current lists are bounded; profile an actual long-list bottleneck
  before introducing it.
- AI currently paints complete images rather than generating displayed prose,
  so token streaming does not apply. Moving painting to a durable queue needs
  a worker, persisted job ownership/results and retries; it is a separate change
  from reducing read latency. Existing painting claims and deadlines remain.
- The app uses Supabase's HTTP Data API rather than opening PostgreSQL
  connections per function. A new application-side connection pool is unnecessary.
- Vercel handles instance scaling and traffic distribution. Changing function
  regions requires checking the deployed project's region against Supabase's
  region; no hosting settings were changed during this repository update.
- No blocking third-party scripts were found. Speed Insights is loaded by its
  framework integration only when enabled.

## Validation

Run `npm test` and `npm run lint`. On this Windows host, Turbopack's CSS worker
exits before connecting; `npm run build --workspace maria -- --webpack` is the
production-build fallback used for verification.

For device validation, use a production build with a narrow viewport, CPU
throttling and Slow 4G. Inspect loading-bar and compass timing, search cancellation,
drawer opening and recovery after an offline table refresh. Emulation is not a
substitute for a session on a physical low-end phone.

Verified in this update: 1,354 tests passed, both workspace linters passed, and
the Webpack production build succeeded. An authenticated browser session at
375 × 812 loaded the character sheet, inventory and play table with no browser
warnings or errors. A temporary local OTLP collector received Next.js request
spans and Supabase HTTP spans. Production telemetry ingestion and physical
slow-device/network benchmarks remain deployment checks.

The renderer regression test records 59–60 draws across 120 simulated animation
frames. Tests also cover hidden-tab suspension, bounded 4K backing stores,
released resize snapshots, live dice appearance updates, rejoining, TV displays
and failed skin preload recovery. A follow-up browser check verified the deferred
background on the sign-in page without console warnings or errors; that fresh
session required sign-in for table checks, so the new sync paths were verified
through the automated regression tests.

Loading-state tests cover waiting for the bar to finish, skipping the wheel
on fast loads, overlapping boundaries and interrupted navigation. The compass
was visually checked against production styles; its persistent root mount
allows the exit fade to finish after a loading boundary disappears.

The focused Prettier check passes for every edited source and documentation
file. The repository-wide `npm run format:check` reports existing formatting
differences elsewhere; those were left outside this performance update.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@Maria/AGENTS.md

## Interaction & Coding Rules

- **Minimal Commentary:** Do NOT write excessive, narrative, or obvious comments in the code. Rely on clean, self-documenting code. Only add brief comments when explaining non-obvious security constraints, complex regex, or database workarounds.
- **Ultra-Concise Responses:** Keep user-facing explanations to an absolute minimum to save token context. State what was changed in 1–3 bullet points without conversational fluff or introductory preamble.
- **Strict Code Architecture:** Always respect the split between `Sina` (data layer, rules, schema) and `Maria` (UI, components). Derive constants instead of duplicating them.
- **Token Consistency:** Use established Tailwind theme tokens and `@theme inline` variables (`--color-gold`, `--color-surface`, `field-styles.js`) instead of hardcoded hex or arbitrary RGBA values.
- **Versioning:** Follow SemVer format `v0.x.y`. Bump the minor version (`0.X.0`, resetting patch to 0) when adding new features or capabilities, and bump the patch version (`0.x.Y`) for bug fixes, tests, security updates, or refactoring.

## Commands

Run these from the repository root; each delegates to the right workspace.

| Command                       | What it does                                        |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Next dev server on :3000                            |
| `npm run build` / `npm start` | Production build / serve one                        |
| `npm test`                    | Sina's suite, on `node --test`                      |
| `npm run lint`                | ESLint over both workspaces                         |
| `npm run format` / `:check`   | Prettier, writing / reporting                       |
| `npm run db:push`             | Apply pending migrations to the linked project      |
| `npm run db:new` / `db:list`  | Scaffold a migration / compare local against remote |

One test file, or one test by name:

```bash
npm test --workspace sina -- src/rules/character.test.js
```

```bash
npm test --workspace sina -- --test-name-pattern="handle"
```

Tests sit beside the code they cover in `Sina/src/**/*.test.js` and run against
`Sina/src/supabase-stub.js` — they never reach a database, so nothing here
verifies SQL, and `npm run db:list` is the only thing that catches a migration
committed but never pushed. Maria has no test suite.

Running the app needs `Maria/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) and a Supabase project with the migrations
applied; the README covers setup from a fresh clone.

## Architecture

An npm workspace monorepo, two packages, one deliberate seam:

- **Maria** — Next.js 16, React 19, Tailwind v4. Routes, components, Server
  Actions, and every sentence a user reads.
- **Sina** — no dependency on Next. Owns Supabase client construction, every
  query, and every validation rule. Plain ESM (`"type": "module"`), shipped as
  source rather than a build artefact, so `next.config.mjs` lists it under
  `transpilePackages`.

What keeps that seam intact:

- **Sina reports `reason` codes, Maria writes the copy.** `handle_taken` is a
  backend fact; "That name and tag are already taken" is a product decision.
  `classify()` at the top of each `Sina/src/data/*.js` maps Postgres SQLSTATEs
  and trigger messages to codes; the `*_COPY` maps in Maria's `actions.js` files
  turn them into English. A Supabase or Postgres string must never reach the
  user — unclassified failures go to `logFailure` / `logUncovered` in
  [errors.js](Maria/lib/errors.js), the only `console.*` in the app.
- **Framework-specific pieces are passed in, never imported.**
  `createServerSupabase(cookies)` takes a cookie adapter; Next's lives in
  [lib/supabase.js](Maria/lib/supabase.js). Always a fresh client per request — a
  module-level singleton shares one user's session with every other request.
- **Sina's `exports` map is the public surface.** A new module is unimportable
  until it is listed in `Sina/package.json`. `src/supabase/browser.js` is absent
  on purpose: auth cookies are `httpOnly`, so a browser client would come back
  unauthenticated and silent. Every Supabase call in the app is server-side.
- **Validation runs twice on purpose.** The browser's run is for speed; the
  Server Action calls the same `Sina/src/rules/*` functions, and that is the run
  that counts.
- **Server Actions stay in Maria** — they are the framework's own RPC boundary,
  and Sina deliberately has no framework.

### Auth

- [proxy.js](Maria/proxy.js) — Next 16's rename of `middleware.js` — runs on
  every non-static request. Server Components cannot write cookies, so it is the
  only place a rotated refresh token gets back to the browser; deleting it
  causes logouts that look random.
- `getUser()` on the server, never `getSession()`. Only the former verifies the
  JWT.
- **"Cannot reach auth" is not "signed out."** `authCouldNotAnswer` in
  [session.js](Sina/src/supabase/session.js) draws that line once, for the proxy
  and the pages together. Transport failures arrive as status `0`, so a plain
  `status < 500` reads an outage as a rejection and produces a sign-in loop.
  When auth cannot answer the proxy lets the request through, and the page
  verifies for itself and throws into its error boundary.
- `currentUser()` is the React-cached per-request lookup for Server Components;
  Actions call `getCurrentUser(supabase)` directly.

### Database

`Sina/supabase/migrations/`, applied in filename order. Each file is safe to
re-run _on its own_, but several `create or replace` the same function with
different bodies — running an earlier one after a later one silently downgrades
the live function with no error. After any out-of-order paste, re-run the
highest-numbered file that touches it.

- **RLS is the real guard; the `.eq("user_id", …)` filters in the data layer are
  a second lock on the same door.** Keep both.
- **Limits are enforced in the database too.** Three characters, three campaigns
  and six to a party are triggers; `name#tag` uniqueness is an index. PostgREST
  sits in front of the Server Actions, so application code cannot be the only
  check.
- **Cross-table policies go through `security definer` functions** —
  `owns_campaign`, `owns_character`, `my_character_in_campaign` in
  `20260818160000_break_policy_recursion.sql`. Policies that read each other's
  tables recurse, and because RLS ORs permissive SELECT policies together, one
  such cycle took down every read of `characters`, not just the new feature.
  Write a new cross-table question as a definer function rather than an inline
  `exists` over another RLS-protected table.
- **RLS grants rows, never columns.** A policy that lets somebody read _a_ row
  lets them read _every column_ of it; the `.select()` lists in the data layer
  are ours to choose, not a boundary. Where only part of a row may be shared,
  the read goes through a definer function whose return type is the column list
  — `search_characters`, `campaign_party`. A policy granting a subset of a row
  is not expressible and must not be attempted.
- **Bounds are mirrored in SQL `CHECK` constraints.** Name lengths, `RACES`,
  ability ranges and the rest exist in both `Sina/src/rules/*.js` and a
  migration; changing one means changing both. SQL uses `char_length`, matching
  the rules layer's code-point counting rather than JS `.length`.
- `SELECT` column lists are explicit and never include `user_id`; a test asserts
  it stays out.

### Frontend

- **The app is dark, always.** `globals.css` redefines Tailwind's variant as
  `@custom-variant dark (&)`, so every `dark:` utility applies unconditionally.
  Tailwind v4 has no `darkMode` config key.
- **Race and archetype art ships with the app**, imported as modules from
  `Maria/app/dashboard/race-art/` so the URL carries a content hash and a
  replaced picture cannot leave a stale one cached.
  [character-presentation.js](Maria/app/dashboard/character-presentation.js)
  throws at module load if Sina lists an avatar colour it has no class for, and
  its Tailwind class strings must stay literal for the scanner to find them.
- **Both ESLint configs turn on `no-undef` and `no-unused-vars`**, which
  `eslint-config-next` leaves off for TypeScript's sake. In a plain-JS project
  they are the only thing that catches a missing import — one shipped past a
  clean build and crashed a dialog the first time a user opened it.
- Campaign maps are resized and re-encoded in the browser
  ([image-compression.js](Maria/lib/image-compression.js)) before travelling in a
  Server Action's form body. `serverActions.bodySizeLimit` sits one step above
  `MAX_MAP_BYTES` so our own check is the one that speaks, not the framework's.

## Per-commit

- **Add an entry to [changelog.js](Maria/app/components/changelog.js) with every
  release** — `version`, date, and what changed for someone _using_ the app.
  `changes` is what is new, `fixes` is what was broken. It is hand-written
  because a deploy host has no git history to read, and a commit subject is
  written for whoever maintains the code.
- **The `version` is the SemVer above, and the changelog is where it is
  decided.** Bump it there and in all three `package.json` files together, then
  run `npm install --package-lock-only` so the lockfile agrees. A commit that
  changes nothing a user can observe — a README pass, a comment sweep — gets no
  entry and no number; the ledger records releases, not commits.
- `next dev` rewrites `Maria/AGENTS.md` and `Maria/CLAUDE.md` with its managed
  block. Commit that alongside your work rather than reverting it.

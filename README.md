# Dungeons & Demons

A campaign companion for tabletop groups: sign in, roll up characters, and keep
their sheets in one place.

An npm workspace monorepo with two packages:

| Package | Role |
| --- | --- |
| **Maria** | Frontend — the Next.js 16 application, React 19, Tailwind CSS v4 |
| **Sina** | Backend — database schema, data access, and the rules that guard it |

Sina has no dependency on Next.js. It owns the Supabase clients, every query,
and every validation rule; where something genuinely needs the framework — the
request-scoped cookie store, for instance — Maria passes it in. That keeps the
backend portable and makes the seam between the two obvious rather than
implied.

---

## Running it from a fresh clone

### 1. Prerequisites

- **Node.js 20.9 or newer** (Next 16 requires it) — `node --version`
- **npm 7 or newer**, for workspace support — ships with Node
- A **Supabase project**. The free tier is plenty; create one at
  [supabase.com/dashboard](https://supabase.com/dashboard).

### 2. Clone and install

```bash
git clone https://github.com/Attack-on-Main-Branch/DnD.git
```

```bash
cd DnD && npm install
```

One install at the root covers both workspaces.

### 3. Point the app at your Supabase project

```bash
cp Maria/.env.example Maria/.env.local
```

Environment files belong to **Maria**, because that is where Next looks for
them. Fill in both values from the Supabase dashboard, under **Project
Settings → API**:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | *Project URL* — the bare origin, e.g. `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *Project API keys → anon / public* |

> **Use the bare project URL**, with no `/rest/v1/` on the end. The client
> appends its own paths, so a trailing path sends every auth call to a URL that
> does not exist.

Both values are safe in the browser — the anon key only grants what your Row
Level Security policies allow. **Never** put the `service_role` key in this
file, or in any `NEXT_PUBLIC_` variable: it bypasses RLS entirely.

### 4. Create the database schema

The schema lives in `Sina/supabase/migrations/`. Pick either route.

**Option A — paste the SQL (no extra tooling).** In the Supabase dashboard open
**SQL Editor → New query**, then paste and run each file in filename order:

1. `20260811140554_characters.sql` — the `characters` table, RLS policies, the
   unique `name#tag` index and the three-per-account trigger
2. `20260811141732_revoke_trigger_function_execute.sql` — revokes the public
   `EXECUTE` grant on the trigger function
3. `20260811144707_character_color_and_level.sql` — adds `color_theme` and
   `level`

Every script is idempotent, so re-running one is harmless.

**Option B — the Supabase CLI.** Already a dev dependency of Sina. One-off
setup, run from the repository root:

```bash
npx supabase login
```

```bash
cd Sina && npx supabase link --project-ref <your-project-ref> && cd ..
```

Then, now and whenever migrations change:

```bash
npm run db:push
```

### 5. Configure auth

In **Authentication → Providers → Email**:

- **Confirm email** — the app works either way. Switched **off**, sign-up logs
  the user straight in. Switched **on**, Supabase emails a confirmation link,
  and you will need a route to handle it (see *Email confirmation* below).
- **Leaked password protection** — worth enabling; it checks new passwords
  against HaveIBeenPwned.

### 6. Start it

```bash
npm run dev
```

Open <http://localhost:3000>. There is no landing page — `/` sends you to
`/login`, or to `/dashboard` if you already have a session.

---

## Scripts

Run these from the repository root; each delegates to the right workspace.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Apply pending migrations to the linked project |
| `npm run db:new` | Scaffold a new migration file |
| `npm run db:list` | Compare local migrations against the remote |

> Running `npm start` on `http://localhost` will not keep you signed in: auth
> cookies are marked `secure` in production builds, and a browser drops those
> over plain HTTP. Use `npm run dev` locally, or serve over HTTPS.

---

## Layout

```
Maria/                       frontend
  app/
    login/                   sign-in and sign-up views, auth Server Actions
    dashboard/               character roster, creation flow, settings
      character/[id]/        character sheet with tabs
    components/ui/           shared primitives — Button, TextField, SelectMenu, …
  lib/supabase.js            the Next-specific cookie adapter for Sina
  proxy.js                   session refresh and route protection

Sina/                        backend
  src/rules/                 what is valid: auth, character, account
  src/data/                  every query and mutation
  src/supabase/              client construction, access policy
  supabase/migrations/       database schema, in order

assets/                      source artwork, git-ignored (see below)
```

A few decisions worth knowing before changing things:

- **Server Actions stay in Maria.** They are the framework's own RPC boundary;
  moving them into Sina would mean shipping framework-specific files from a
  package that deliberately has no framework. The actions are thin — they read
  the form, call Sina, and translate a failure code into a sentence.
- **Sina reports codes, Maria writes the copy.** `handle_taken` is a backend
  fact; "That name and tag are already taken" is a product decision. Wording
  can change without anyone touching a query.
- **`proxy.js`, not `middleware.js`.** Next 16 renamed the convention. The old
  name still works but warns on every build.
- **The proxy is what keeps you signed in.** Server Components cannot write
  cookies, so it is the only place a rotated refresh token gets back to the
  browser. Deleting it causes logouts that look random.
- **`getUser()`, never `getSession()`, on the server.** Only the former
  verifies the JWT; the latter just reads a cookie.
- **Validation rules are imported by both sides.** The browser's run is for
  speed; the Server Action runs the same functions as the check that counts.
- **Limits are enforced in the database too.** The three-character cap is a
  trigger and the `name#tag` uniqueness is an index — an API sits in front of
  the Server Actions, so application code cannot be the only guard.
- **Race artwork ships with the app.** The images under `Maria/public/races`
  are the same for every visitor, so they belong in the repository and on the
  CDN rather than in a database or a storage bucket — the `characters` row
  only stores the race, and the mapping to a file lives in
  `character-presentation.js`. A clone has everything it needs; `assets/`
  holds the multi-megabyte originals those were derived from and is
  git-ignored, so it will not be there. Per-user uploads, if they ever exist,
  are a different problem and belong in Supabase Storage with the path in the
  database.

---

## Email confirmation

Sign-up currently expects **Confirm email** to be off, which is why a new
account lands straight on the dashboard.

If you switch it on, Supabase emails a link containing a one-time token. That
link needs a route in Maria — typically `app/auth/confirm/route.js` — which
calls `supabase.auth.verifyOtp({ token_hash, type })` to exchange the token for
a session. You will also need to pass `emailRedirectTo` in the `signUp` call and
allow-list each origin under **Authentication → URL Configuration → Redirect
URLs**.

Note that Supabase's built-in email sender is for development only: it is
heavily rate-limited and may only deliver to your own team's addresses.
Production needs custom SMTP under **Project Settings → Authentication → SMTP**.

---

## Deploying to Vercel

Import the repository and set the **root directory to `Maria`**, so Vercel
builds the Next app rather than the workspace root. Add
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under the
project's Environment Variables. If email confirmation is on, add the
deployment's `/auth/confirm` URL to Supabase's Redirect URLs as well.

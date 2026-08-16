# Grimoire Tales

A campaign companion for tabletop groups: sign in, roll up characters, and keep
their sheets in one place.

An npm workspace monorepo with two packages:

| Package   | Role                                                                |
| --------- | ------------------------------------------------------------------- |
| **Maria** | Frontend — the Next.js 16 application, React 19, Tailwind CSS v4    |
| **Sina**  | Backend — database schema, data access, and the rules that guard it |

Sina has no dependency on Next.js. It owns the Supabase clients, every data
query, and every validation rule; where something genuinely needs the framework
— the request-scoped cookie store, for instance — Maria passes it in.

The one Supabase call Maria makes for itself is `auth.getUser()`, in `proxy.js`
and in `lib/supabase.js`, because the token has to be revalidated before
anything can be decided about the request. Even there the _decision_ stays in
Sina: `authCouldNotAnswer` and `resolveRedirect` in `src/supabase/session.js`.
That keeps the backend portable and makes the seam between the two obvious
rather than implied.

---

## Running it from a fresh clone

### 1. Prerequisites

- **Node.js 20.9 or newer** (Next 16 requires it) — `node --version`. npm ships
  with it and any version this recent has the workspace support we need.
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
them. Both values come from your project's API settings in the Supabase
dashboard:

| Variable                        | What to paste                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | The project URL — the bare origin, e.g. `https://abcd1234.supabase.co`              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **publishable** key (`sb_publishable_…`), or on an older project the _anon_ JWT |

> **Use the bare project URL**, with no `/rest/v1/` on the end. The client
> appends its own paths, so a trailing path sends every auth call to a URL that
> does not exist.

Either key format works — the pinned `@supabase/supabase-js` recognises both,
and nothing in this repo inspects the value. Both are meant to reach the
browser, and only grant what your Row Level Security policies allow.

**Never** put the secret key — `sb_secret_…`, or the legacy `service_role` JWT
— in this file or in any `NEXT_PUBLIC_` variable. It bypasses RLS entirely.

### 4. Create the database schema

The schema lives in `Sina/supabase/migrations/`. Pick either route.

**Option A — paste the SQL (no extra tooling).** In the Supabase dashboard open
**SQL Editor → New query**, then paste and run each file **in filename order**:

1. `20260811140554_characters.sql` — the `characters` table, RLS policies, the
   unique `name#tag` index and the three-per-account trigger
2. `20260811141732_revoke_trigger_function_execute.sql` — revokes the public
   `EXECUTE` grant on the trigger function
3. `20260811144707_character_color_and_level.sql` — adds `color_theme` and
   `level`
4. `20260814195921_character_class.sql` — adds `archetype` and `class_id`, with
   the paired `characters_class_check` constraint
5. `20260814215246_race_check_and_limit_lock.sql` — constrains `race` to the
   nine playable races, and takes a per-user advisory lock in the character
   limit trigger so concurrent inserts cannot race past it
6. `20260816120000_limit_trigger_scope.sql` — stops that trigger counting rows
   for an insert that is not the caller's own, which otherwise answered whether
   any account you could name had already used its three slots

> **Order matters more than it looks.** Every file is safe to re-run _on its
> own_ — tables, indexes and columns are guarded, each policy is dropped first,
> and each constraint is wrapped in an existence check. But files 1, 5 and 6
> each `create or replace` the **same** function, `enforce_character_limit`,
> with a different body. Going back and re-running an earlier one after a later
> one silently downgrades the live function, with no error: re-running file 1
> strips both the advisory lock and the ownership guard; re-running file 5
> strips the guard and reopens the leak file 6 closes. After any out-of-order
> paste, finish by running the highest-numbered of those three again.

**Option B — the Supabase CLI.** Already a dev dependency of Sina, and it
tracks which migrations have been applied, so it cannot make the mistake above.
One-off setup:

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

The link is per-machine — the CLI stores the project reference in
`Sina/supabase/.temp`, which is git-ignored — so everyone runs `link` once for
themselves.

### 5. Configure auth

In **Authentication → Providers → Email**:

- **Confirm email** — the app works either way. Switched **off**, sign-up logs
  the user straight in. Switched **on**, Supabase emails a confirmation link,
  and you will need a route to handle it (see _Email confirmation_ below).
- **Leaked password protection** — worth enabling; it checks new passwords
  against HaveIBeenPwned.

### 6. Start it

```bash
npm run dev
```

Open <http://localhost:3000>. There is no landing page — `/` sends you to
`/login`, or to `/dashboard` if you already have a session.

---

## Working with someone else

The database is not on anybody's machine. It is hosted by Supabase, and
`Maria/.env.local` decides **which** database the app talks to. That one file
is the whole answer to "will I see the account they just created?".

**Each developer with their own Supabase project** is the better default. They
create a free project, run the migrations, and fill in their own two values.
Nothing they do is visible to you, and they try a migration out on their own
data before it ever reaches yours.

**Sharing one project** means handing over your two values, and skipping steps
4 and 5 — the schema is already there. Every account and character is then
common to both of you. Worth knowing before choosing it: you are both working
against real data, and a migration pushed by either of you lands for both.

The publishable/anon key is safe to hand to a collaborator — it reaches every
visitor's browser anyway, and RLS is what actually protects the rows. It is
still not something to post in public: anyone holding it can create accounts in
your project. The secret key is a different matter and is never shared.

Changing the schema on a shared project needs more than the key: the CLI
authenticates as _you_, so a collaborator has to be invited to the project in
the Supabase dashboard before `npx supabase link` will work for them.

---

## Scripts

Run these from the repository root; each delegates to the right workspace.

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Development server with hot reload             |
| `npm run build`        | Production build                               |
| `npm start`            | Serve a production build                       |
| `npm test`             | Sina's test suite, on `node --test`            |
| `npm run lint`         | ESLint, both workspaces                        |
| `npm run format`       | Prettier, writing changes                      |
| `npm run format:check` | Prettier, reporting rather than writing        |
| `npm run db:push`      | Apply pending migrations to the linked project |
| `npm run db:new`       | Scaffold a new migration file                  |
| `npm run db:list`      | Compare local migrations against the remote    |

`npm run db:list` is the one that catches a migration committed but never
pushed. Nothing else connects the two: the tests run against stubs and never
touch SQL.

> Serving a production build over plain HTTP will not keep you signed in on any
> address **except** localhost: auth cookies are marked `secure` outside
> development, and browsers only make an exception for localhost, which they
> treat as a trustworthy origin. So `npm start` is fine at
> <http://localhost:3000>, and reaching that same server from another machine
> on the network is not — use HTTPS for that.

---

## Layout

```
Maria/                       frontend
  app/
    login/                   sign-in and sign-up views, auth Server Actions
    dashboard/               character roster, creation flow, settings
      character/[id]/        character sheet with tabs
      race-art/              card artwork, imported as modules
      error.jsx              error boundary for the signed-in area
    components/              header, changelog panel, the animated mark
      ui/                    shared primitives — Button, TextField, SelectMenu, …
      brand/                 the grimoire mark itself
      paths-background/      the animated background and its renderer
    icon.png, apple-icon.png the app icons, by Next's file conventions
  lib/supabase.js            the Next cookie adapter, and the current-user lookup
  lib/errors.js              failure logging, shared by actions and pages
  proxy.js                   session refresh and route protection

Sina/                        backend
  src/rules/                 what is valid: auth, character, account
  src/data/                  every query and mutation
  src/supabase/              client construction, access policy
  src/*.test.js              the suites, beside the code they cover
  src/supabase-stub.js       the fake query builder those suites run against
  supabase/migrations/       database schema, in order

assets/                      source artwork, git-ignored (see below)
```

---

## How it is put together

A few decisions worth knowing before changing things.

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
- **"Cannot reach auth" is not "signed out".** Collapsing the two made an
  outage look like an expired session, so users signed in, got bounced, and
  tried again. `authCouldNotAnswer` draws the line once, and the proxy lets
  those requests through rather than diagnosing them — the page then verifies
  for itself and throws into its error boundary.
- **Validation rules are imported by both sides.** The browser's run is for
  speed; the Server Action runs the same functions as the check that counts.
- **Limits are enforced in the database too.** The three-character cap is a
  trigger and the `name#tag` uniqueness is an index — an API sits in front of
  the Server Actions, so application code cannot be the only guard.
- **Race artwork ships with the app,** under `Maria/app/dashboard/race-art`.
  The images are the same for every visitor, so they belong in the repository;
  the `characters` row stores only the race, and `character-presentation.js`
  maps it to a file by importing each `.webp` as a module rather than naming a
  path under `public/`. That puts a content hash in the URL, so replacing a
  picture cannot leave a stale one in anybody's cache. `/assets/` holds the
  full-resolution originals and is git-ignored, so a clone will not have it.
- **The changelog is written by hand.** `Maria/app/components/changelog.js`
  feeds the panel behind the mark in the dashboard's corner, and it is meant to
  gain an entry with every commit — a commit subject is written for whoever
  maintains the code, not for whoever uses the app.

---

## Email confirmation

Sign-up currently expects **Confirm email** to be off, which is why a new
account lands straight on the dashboard.

If you switch it on, Supabase emails a link containing a one-time token. That
link needs a route in Maria — typically `app/auth/confirm/route.js`, which does
not exist yet — calling `supabase.auth.verifyOtp({ token_hash, type })` to
exchange the token for a session. You will also need to pass `emailRedirectTo`
in the `signUp` call — `Sina/src/data/auth.js`, which does not pass it today.

Then allow-list that redirect under **Authentication → URL Configuration →
Redirect URLs**. Entries are matched against the **full** URL, so a bare origin
does not authorise `…/auth/confirm` — add the whole path, or a wildcard such as
`http://localhost:3000/**`. An unmatched value is silently replaced by the Site
URL, which looks like the link simply not working.

Note that Supabase's built-in email sender is for development only: it is
heavily rate-limited and may only deliver to your own team's addresses.
Production needs custom SMTP under **Project Settings → Authentication → SMTP**.

---

## Deploying to Vercel

Import the repository and set the **root directory to `Maria`**. That is where
the Next app lives, and it is what Vercel uses to detect the framework and find
the build output; the root `npm run build` only delegates to Maria anyway.

Maria depends on `sina` as a workspace package, resolved through a symlink the
root install creates — so the install has to run with the repository root in
view. If a build fails to resolve `sina`, that is the setting to check first.

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under the
project's Environment Variables. If email confirmation is on, add the
deployment's full `/auth/confirm` URL to Supabase's Redirect URLs as well.

import { redirect } from "next/navigation";
import { listCharacters } from "sina/data/characters";
import { MAX_CHARACTERS } from "sina/rules/character";

import FormAlert from "@/app/components/ui/form-alert";
import TypingText from "@/app/components/ui/typing-text";
import { logFailure } from "@/lib/errors";
import { createClient, currentUser } from "@/lib/supabase";

import CharacterInventory from "./character-inventory";
import CreateCharacterPanel from "./create-character-panel";

/*
 * A static import, after trying `dynamic()` and measuring it.
 *
 * From a Server Component it cannot split: lazy-loading.md:60 says automatic
 * code splitting is not supported when a Server Component dynamically imports a
 * Client Component. In the built client-reference manifest the panel resolved to
 * the same eager chunk set as character-card.jsx, and `dynamic()` cost a little
 * more on top — bailout and preload modules pulled in for nothing.
 *
 * The other half of that change stays: character-inventory.jsx is a Server
 * Component again and the `?new` branch is decided here. A real split needs the
 * lazy boundary inside a Client Component (lazy-loading.md:66).
 */

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({ searchParams }) {
  // `?new` opens the creation sheet. Keeping it in the URL rather than in
  // component state is what lets the header's branding link close it.
  const { new: creating } = await searchParams;

  const supabase = await createClient();

  // The proxy already gates this route, but authorisation is re-checked here
  // on purpose: never let a single layer be the only thing standing between a
  // visitor and protected data.
  const { user, error: authError } = await currentUser();

  // An auth service that cannot answer is not an expired session. Sending this
  // visitor to /login would have them sign in and bounce straight back.
  if (authError) {
    logFailure("dashboard/auth", authError);
    throw new Error("Could not verify your session (auth_unavailable)");
  }

  if (!user) {
    redirect("/login");
  }

  const displayName = user.user_metadata?.display_name ?? null;
  const { data: characters, error } = await listCharacters(supabase, user.id);

  if (error) {
    logFailure("listCharacters", error);
  }

  // The header and the flex column come from dashboard/layout.jsx now.
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <h1 className="font-display text-3xl leading-tight font-semibold sm:text-4xl">
          <TypingText
            segments={[
              { text: "Welcome back, ", className: "text-ink" },
              {
                text: displayName ?? user.email,
                // The gold and the ivory are only 1.2:1 apart, so the glow
                // does real work here — it separates the name from the
                // sentence for anyone who cannot see the hue difference.
                className:
                  "text-gold drop-shadow-[0_0_20px_rgba(255,223,156,0.45)]",
              },
            ]}
          />
        </h1>

        {!error && (
          <p className="font-sans text-xs tracking-wide text-ink/50 uppercase">
            {characters.length} of {MAX_CHARACTERS} slots used
          </p>
        )}
      </div>

      <div className="mt-10">
        {error ? (
          <FormAlert>
            Could not load your characters
            {error.reason === "missing_table"
              ? " — run the migrations in Sina/supabase/migrations to create the table."
              : /*
                    The only place `detail` still reaches a screen, and only off
                    production. This banner's other branch is openly written for
                    whoever is running the app rather than for a player, so the
                    raw Postgres string is useful here in a way it is nowhere
                    else — but shipping constraint and relation names to real
                    users is information disclosure. The server log has it in
                    both environments.
                  */
                process.env.NODE_ENV === "production"
                ? "."
                : `: ${error.detail}`}
          </FormAlert>
        ) : /*
              The branch lives here, on the server, because this is where the
              answer already is — `?new` was read off the URL above. It used to
              be made inside CharacterInventory, which meant that component had
              to be a Client Component and took the whole creation flow into the
              browser with it for every visitor who only wanted the roster.
            */
        creating !== undefined ? (
          <CreateCharacterPanel />
        ) : (
          <CharacterInventory characters={characters} />
        )}
      </div>
    </main>
  );
}

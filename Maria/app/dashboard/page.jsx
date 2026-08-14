import { redirect } from "next/navigation";
import { listCharacters } from "sina/data/characters";
import { MAX_CHARACTERS } from "sina/rules/character";

import SiteHeader from "@/app/components/site-header";
import FormAlert from "@/app/components/ui/form-alert";
import TypingText from "@/app/components/ui/typing-text";
import { createClient, getCurrentUser } from "@/lib/supabase";

import CharacterInventory from "./character-inventory";

export const metadata = {
  title: "Dashboard · Grimoire Tales",
};

export default async function DashboardPage({ searchParams }) {
  // `?new` opens the creation sheet. Keeping it in the URL rather than in
  // component state is what lets the header's branding link close it.
  const { new: creating } = await searchParams;

  const supabase = await createClient();

  // The proxy already gates this route, but authorisation is re-checked here
  // on purpose: never let a single layer be the only thing standing between a
  // visitor and protected data.
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const displayName = user.user_metadata?.display_name ?? null;
  const { data: characters, error } = await listCharacters(supabase, user.id);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader displayName={displayName} email={user.email} />

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
                : `: ${error.detail}`}
            </FormAlert>
          ) : (
            <CharacterInventory
              characters={characters}
              creating={creating !== undefined}
            />
          )}
        </div>
      </main>
    </div>
  );
}

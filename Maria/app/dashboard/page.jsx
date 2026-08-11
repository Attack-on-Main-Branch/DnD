import { redirect } from "next/navigation";
import { listCharacters } from "sina/data/characters";

import Link from "next/link";
import Button, { buttonClasses } from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import { logOut } from "@/app/login/actions";
import { createClient, getCurrentUser } from "@/lib/supabase";

import CharacterInventory from "./character-inventory";

export const metadata = {
  title: "Dashboard · Dungeons and Demons",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // The proxy already gates this route, but authorisation is re-checked here
  // on purpose: never let a single layer be the only thing standing between a
  // visitor and protected data.
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data: characters, error } = await listCharacters(supabase, user.id);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12 font-sans">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to your D&amp;D Dashboard,{" "}
            {user.user_metadata?.display_name ?? user.email}
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/settings"
            className={buttonClasses({ variant: "secondary" })}
          >
            Settings
          </Link>

          <form action={logOut}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {error ? (
        <FormAlert>
          Could not load your characters
          {error.reason === "missing_table"
            ? " — run the migrations in Sina/supabase/migrations to create the table."
            : `: ${error.detail}`}
        </FormAlert>
      ) : (
        <CharacterInventory characters={characters} />
      )}
    </main>
  );
}

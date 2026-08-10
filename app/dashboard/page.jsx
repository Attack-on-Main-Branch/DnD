import { redirect } from "next/navigation";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import { logOut } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/server";

import CharacterInventory from "./character-inventory";

export const metadata = {
  title: "Dashboard · Dungeons and Demons",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // The proxy already gates this route, but authorisation is re-checked here
  // on purpose: never let a single layer be the only thing standing between a
  // visitor and protected data. `getUser()` verifies the JWT with Supabase
  // rather than trusting the cookie.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Row Level Security already limits this to the caller's own rows; the
  // explicit filter is belt-and-braces and keeps the index in play.
  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select(
      "id, kind, name, discriminator, race, alignment, backstory, personality, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

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

        <form action={logOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </header>

      {charactersError ? (
        <FormAlert>
          Could not load your characters: {charactersError.message}
          {charactersError.code === "42P01" &&
            " — run supabase/migrations/0001_characters.sql in the Supabase SQL Editor to create the table."}
        </FormAlert>
      ) : (
        <CharacterInventory characters={characters ?? []} />
      )}
    </main>
  );
}

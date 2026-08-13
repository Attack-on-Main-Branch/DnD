import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCharacter } from "sina/data/characters";
import { characterHandle } from "sina/rules/character";

import Link from "next/link";
import Avatar from "@/app/components/ui/avatar";
import { createClient, getCurrentUser } from "@/lib/supabase";

import CharacterTabs from "./character-tabs";
import PlayButton from "./play-button";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const character = await loadCharacter(id);

  return {
    title: character
      ? `${characterHandle(character)} · Dungeons and Demons`
      : "Character · Dungeons and Demons",
  };
}

export default async function CharacterPage({ params }) {
  const { id } = await params;
  const character = await loadCharacter(id);

  // Row Level Security means somebody else's id reads as missing rather than
  // forbidden, which is the right answer: it does not confirm the character
  // exists to someone who has no business knowing.
  if (!character) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 font-sans">
      <Link
        href="/dashboard"
        className="cursor-pointer self-start text-sm text-neutral-600 transition hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        ← Back to characters
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={character.name}
            colorTheme={character.color_theme}
            size="lg"
          />

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {character.name}
            </h1>
            <p className="font-mono text-sm text-neutral-400">
              {characterHandle(character)}
            </p>
          </div>
        </div>

        <PlayButton />
      </header>

      <CharacterTabs character={character} />
    </main>
  );
}

/**
 * Wrapped in `cache` because generateMetadata and the page itself both need
 * the character: without it the same row is fetched twice per request.
 */
const loadCharacter = cache(async function loadCharacter(id) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data } = await getCharacter(supabase, { id, userId: user.id });

  return data;
});

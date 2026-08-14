import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCharacter } from "sina/data/characters";
import { characterHandle } from "sina/rules/character";

import SiteHeader from "@/app/components/site-header";
import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import { createClient, getCurrentUser } from "@/lib/supabase";

import CharacterTabs from "./character-tabs";
import PlayButton from "./play-button";

/**
 * Both the locale and the time zone are pinned, and both matter.
 *
 * `toLocaleDateString()` with no arguments reads each of them from the host it
 * runs on. The tabs are a client component rendered from this Server
 * Component, so that call ran twice — once under Node's ICU default, usually
 * en-US at UTC, and once in a browser at hu-HU, Europe/Budapest — and produced
 * two different strings for the same row. That is a hydration mismatch. An
 * unpinned locale would also drift between deploy environments even if only
 * the server ever formatted it.
 */
const CREATED_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { character } = await loadCharacter(id);

  return {
    title: character
      ? `${characterHandle(character)} · Grimoire Tales`
      : "Character · Grimoire Tales",
  };
}

export default async function CharacterPage({ params }) {
  const { id } = await params;
  const { character, user } = await loadCharacter(id);

  // Row Level Security means somebody else's id reads as missing rather than
  // forbidden, which is the right answer: it does not confirm the character
  // exists to someone who has no business knowing.
  if (!character) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        displayName={user.user_metadata?.display_name ?? null}
        email={user.email}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/dashboard"
          className="cursor-pointer self-start font-sans text-sm text-ink/60 transition hover:text-gold"
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
              <h1 className="truncate font-display text-3xl font-semibold tracking-wide text-ink">
                {character.name}
              </h1>
              <p className="font-mono text-sm text-gold/70">
                {characterHandle(character)}
              </p>
            </div>
          </div>

          <PlayButton />
        </header>

        <div
          className={surfaceClasses({
            glow: true,
            className: "rounded-2xl px-5 pt-2 pb-6 sm:px-8 sm:pb-8",
          })}
        >
          <CharacterTabs
            character={character}
            createdLabel={CREATED_FORMAT.format(new Date(character.created_at))}
          />
        </div>
      </main>
    </div>
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

  return { character: data, user };
});

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCharacter } from "sina/data/characters";
import { characterHandle } from "sina/rules/character";

import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import Avatar from "@/app/components/ui/avatar";
import { surfaceClasses } from "@/app/components/ui/surface";
import { logFailure } from "@/lib/errors";
import { createClient, currentUser } from "@/lib/supabase";

import {
  InventoryPanel,
  NotesPanel,
  OverviewPanel,
  StoryPanel,
} from "./character-panels";
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

/**
 * Ignores the loader's error deliberately: `character` is null on a failed read
 * so the generic branch below already titles it correctly, and there is nothing
 * useful to name a page that is about to be replaced. The page does the throwing.
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const { character } = await loadCharacter(id);

  // Bare — the root layout's `title.template` adds the suffix.
  return {
    title: character ? characterHandle(character) : "Character",
  };
}

export default async function CharacterPage({ params }) {
  const { id } = await params;
  // `user` is loaded too, for the guard inside the loader — the header that
  // used to need it here now comes from dashboard/layout.jsx.
  const { character, error } = await loadCharacter(id);

  // A failed read is not a missing character: `getCharacter` returns null for
  // both, and /dashboard already distinguishes them, offering "run the
  // migrations" for the same `missing_table`.
  //
  // `bad_id` is the exception — a uuid column rejects a junk id before looking
  // at a row, so it arrives as an error but really is a miss. It falls through
  // to notFound() with everything else that was simply not there.
  if (error && error.reason !== "bad_id") {
    throw new Error(`Could not load the character (${error.reason})`);
  }

  // Row Level Security means somebody else's id reads as missing rather than
  // forbidden, which is the right answer: it does not confirm the character
  // exists to someone who has no business knowing.
  if (!character) {
    notFound();
  }

  return (
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
            initials={characterInitials(character.name)}
            colorClass={avatarColorClass(character.color_theme)}
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
        {/*
            Built here, on the server, and handed over as rendered output. The
            tabstrip needs the browser; the panels do not.
          */}
        <CharacterTabs
          panels={{
            overview: (
              <OverviewPanel
                character={character}
                createdLabel={CREATED_FORMAT.format(
                  new Date(character.created_at),
                )}
              />
            ),
            story: <StoryPanel character={character} />,
            inventory: <InventoryPanel />,
            notes: <NotesPanel />,
          }}
        />
      </div>
    </main>
  );
}

/**
 * Wrapped in `cache` because generateMetadata and the page itself both need
 * the character: without it the same row is fetched twice per request.
 */
const loadCharacter = cache(async function loadCharacter(id) {
  const supabase = await createClient();
  const { user, error: authError } = await currentUser();

  // Same distinction the character read below draws: could not ask is not the
  // same answer as asked and was told no.
  if (authError) {
    logFailure("character/auth", authError);
    throw new Error("Could not verify your session (auth_unavailable)");
  }

  if (!user) {
    redirect("/login");
  }

  // Keep the error. Dropping it is what let a query that never ran read as a
  // character that is not there.
  const { data, error } = await getCharacter(supabase, { id, userId: user.id });

  // Not `bad_id` — a mistyped URL is not a fault worth a log line.
  if (error && error.reason !== "bad_id") {
    logFailure("loadCharacter", error);
  }

  return { character: data, error, user };
});

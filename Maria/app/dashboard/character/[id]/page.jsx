import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { listCampaignsForCharacter } from "sina/data/campaigns";
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
import TabStrip from "@/app/components/ui/tab-strip";
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
/** The sheet's sections, named here beside the panels they select. */
const SHEET_TABS = [
  { value: "overview", label: "Overview" },
  { value: "story", label: "Story" },
  { value: "inventory", label: "Inventory" },
  { value: "notes", label: "Notes" },
];

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
  const { character, campaigns, error } = await loadCharacter(id);

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
        ← Back to dashboard
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-6">
        {/*
          `min-w-0` here as well as on the column inside it. Truncation only
          happens if every flex item along the chain is allowed to shrink, and
          this one is an item of a `flex-wrap` header — without it the row keeps
          its content width and the name runs off the right edge instead of
          ending in an ellipsis.
        */}
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            initials={characterInitials(character.name)}
            colorClass={avatarColorClass(character.color_theme)}
            size="lg"
          />

          <div className="min-w-0">
            {/*
              The campaign beside the name, at the same size, separated by the
              creation sheet's `·` — the one its preview puts between race,
              class and alignment.

              Beside it rather than inside the `<h1>`: the heading stays the
              character's name alone, because a page title that grows when
              somebody else adds this character to something is not the title
              changing.

              `items-baseline` so the two sit on one line rather than one
              floating in the middle of the other's cap height. And no wrapping:
              allowed to wrap, the campaign took its own row led by the
              separator, which reads as a bullet in a list rather than as a
              continuation. Both halves shrink and truncate instead — `min-w-0`
              on each is what permits that, since a flex item's automatic
              minimum size is its content and neither would otherwise give way.
            */}
            <div className="flex items-baseline gap-x-3">
              {/*
                The name does not give way; the campaign does. `shrink-0` keeps
                the heading at its content width so a narrow window truncates
                the context rather than the subject, and `max-w-full` is the
                escape hatch for a name long enough to fill the row on its own —
                at which point it truncates and the campaign shrinks to nothing,
                which is the right order to lose them in.
              */}
              <h1 className="max-w-full shrink-0 truncate font-display text-3xl font-semibold tracking-wide text-ink">
                {character.name}
              </h1>

              {/*
                Plain text, not a link. The campaign page belongs to the Dungeon
                Master who made it, and a player following a link there would
                land on a 404 — that route resolves for its owner and nobody
                else. The title is the useful part; the destination is not
                theirs.

                Shown only where there is one. A "not in a campaign" line under
                every sheet would be furniture, and the absence reads perfectly
                well on its own.
              */}
              {campaigns.length > 0 && (
                <p className="min-w-0 truncate font-display text-3xl font-semibold tracking-wide text-ink/55">
                  <span aria-hidden="true">· </span>
                  {campaigns.map((campaign) => campaign.title).join(" · ")}
                </p>
              )}
            </div>

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
        <TabStrip
          tabs={SHEET_TABS}
          label="Character sheet sections"
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

  if (!data) {
    return { character: null, campaigns: [], error, user };
  }

  // Where this character plays. Logged rather than shown if it fails: the sheet
  // is the page, and a campaign line that cannot load is not a reason to
  // replace it with an error.
  const { data: campaigns, error: campaignError } =
    await listCampaignsForCharacter(supabase, id);

  if (campaignError) {
    logFailure("listCampaignsForCharacter", campaignError);
  }

  return {
    character: data,
    campaigns: campaignError ? [] : campaigns,
    error,
    user,
  };
});

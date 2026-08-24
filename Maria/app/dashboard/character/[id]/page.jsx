import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { listCampaignsForCharacter } from "sina/data/campaigns";
import { getCharacter, listCharacterNotes } from "sina/data/characters";
import { listCharacterInventory } from "sina/data/inventory";
import { characterHandle } from "sina/rules/character";

import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import Avatar from "@/app/components/ui/avatar";
import PlayButton from "@/app/components/ui/play-button";
import { surfaceClasses } from "@/app/components/ui/surface";
import { logFailure } from "@/lib/errors";
import { campaignTablePath } from "@/lib/routes";
import { createClient, currentUser } from "@/lib/supabase";

import {
  InventoryPanel,
  NotesPanel,
  OverviewPanel,
  StoryPanel,
} from "./character-panels";
import EditCharacterPencil from "./edit-character-pencil";
import TabStrip from "@/app/components/ui/tab-strip";

/**
 * Locale and time zone are both pinned: `toLocaleDateString()` reads them from
 * the host, and this runs on the server and again in the browser, producing two
 * different strings for the same row — a hydration mismatch.
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
 * Ignores the loader's error deliberately: `character` is null on a failed read,
 * so the generic branch below titles it. The page does the throwing.
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
  const { character, campaigns, notes, items, error } = await loadCharacter(id);

  // A failed read is not a missing character, though `getCharacter` returns
  // null for both. `bad_id` is the exception: a uuid column rejects a junk id
  // before looking at a row, so it arrives as an error but really is a miss.
  if (error && error.reason !== "bad_id") {
    throw new Error(`Could not load the character (${error.reason})`);
  }

  // RLS makes somebody else's id read as missing rather than forbidden, so a
  // 404 does not confirm the character exists.
  if (!character) {
    notFound();
  }

  const [table] = campaigns;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        data-fade
        href="/dashboard"
        className="float-in cursor-pointer self-start font-sans text-sm text-ink/60 transition hover:text-gold"
      >
        ← Back to dashboard
      </Link>

      {/* `data-fade` sits on the words rather than on the row: the star beside
          them leaves on its own, and a fading ancestor would take it with it
          however it was animating. */}
      <header className="float-in flex flex-wrap items-center justify-between gap-6">
        {/*
          `min-w-0` here as well as on the column inside it. Truncation only
          happens if every flex item along the chain is allowed to shrink, and
          this one is an item of a `flex-wrap` header — without it the row keeps
          its content width and the name runs off the right edge instead of
          ending in an ellipsis.
        */}
        <div data-fade className="flex min-w-0 items-center gap-4">
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

        {/*
          The table this character sits at, and the seat with it — pressing Play
          here means playing this character, even where the same account also
          runs the campaign. That is why the table needs no chair-picker; the
          campaign sheet's Play button is the other door.

          The first campaign where there is more than one: nothing on this sheet
          asks which table. With none, the button stays inert.
        */}
        <PlayButton
          href={table ? campaignTablePath(table.id, character.id) : undefined}
          label={table ? `Play as ${character.name}` : "Play"}
        />
      </header>

      {/* `panel-in` is the creation sheet's opening; `data-fold` is its
          closing, played by the layout on any way back to the dashboard. Tab
          switching in between is the tabstrip's own. */}
      <div
        data-fold
        className={surfaceClasses({
          glow: true,
          className: "panel-in rounded-2xl px-5 pt-2 pb-6 sm:px-8 sm:pb-8",
        })}
      >
        {/*
            Built here, on the server, and handed over as rendered output. The
            tabstrip needs the browser; the panels do not.
          */}
        <TabStrip
          tabs={SHEET_TABS}
          label="Character sheet sections"
          // The pen at the far end of the tab row. A Client Component handed
          // over already built, the same as the panels below it — and the row
          // it edits is the one already read for this page.
          action={<EditCharacterPencil character={character} />}
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
            inventory: <InventoryPanel items={items} />,
            notes: <NotesPanel notes={notes} />,
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
    return { character: null, campaigns: [], notes: [], error, user };
  }

  // Where this character plays, and what its player wrote while playing: one
  // round trip's worth of waiting rather than two. Both are logged rather than
  // shown if they fail — the sheet is the page, and neither is a reason to
  // replace it with an error.
  const [campaigns, notes, items] = await Promise.all([
    listCampaignsForCharacter(supabase, id),
    listCharacterNotes(supabase, id),
    listCharacterInventory(supabase, id),
  ]);

  if (campaigns.error) {
    logFailure("listCampaignsForCharacter", campaigns.error);
  }

  if (notes.error) {
    logFailure("listCharacterNotes", notes.error);
  }

  if (items.error) {
    logFailure("listCharacterInventory", items.error);
  }

  return {
    character: data,
    campaigns: campaigns.error ? [] : campaigns.data,
    notes: notes.error ? [] : notes.data,
    items: items.error ? [] : items.data,
    error,
    user,
  };
});

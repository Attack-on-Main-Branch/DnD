import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { classLabel } from "sina/rules/character";

import NoteList from "@/app/components/ui/note-list";
import PlayButton from "@/app/components/ui/play-button";
import TabStrip from "@/app/components/ui/tab-strip";
import { surfaceClasses } from "@/app/components/ui/surface";
import { campaignTablePath, DUNGEON_MASTER_SEAT } from "@/lib/routes";

import CampaignMap from "./campaign-map";
import { loadCampaign } from "./load-campaign";
import PartyPanel from "./party-panel";

/** The campaign's sections, named beside the panels they select. */
const CAMPAIGN_TABS = [
  { value: "overview", label: "Overview" },
  // `focusable: false` — the panel opens with a search field, so a tab stop on
  // the panel itself only puts an empty step in front of it.
  { value: "party", label: "Party", focusable: false },
  { value: "notes", label: "Notes" },
];

const CREATED_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export async function generateMetadata({ params }) {
  const { id } = await params;
  const loaded = await loadCampaign(id);

  return { title: loaded?.campaign?.title ?? "Campaign" };
}

export default async function CampaignPage({ params }) {
  const { id } = await params;
  const loaded = await loadCampaign(id);

  if (loaded === "signed-out") {
    redirect("/login");
  }

  if (loaded === "auth-unavailable") {
    throw new Error("Could not verify your session (auth_unavailable)");
  }

  // A failed read is not a missing campaign. RLS already makes somebody else's
  // id answer like a deleted one; a query that never ran gets the error page
  // rather than a 404 claiming the campaign does not exist.
  if (loaded.error) {
    throw new Error(`Could not load the campaign (${loaded.error.reason})`);
  }

  if (!loaded.campaign) {
    notFound();
  }

  const { campaign, members, notes } = loaded;

  // Resolved here rather than in PartyPanel: `classLabel` reaches through
  // `classDetails` into the whole ARCHETYPES catalogue, and importing it into a
  // Client Component retains all of it in this route's bundle to print one
  // word. The search results get the same treatment in `findPartyCandidate`.
  const roster = members.map((member) => ({
    ...member,
    pathLabel: classLabel(member.class_id),
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <Link
        data-fade
        href="/dashboard"
        className="float-in cursor-pointer self-start font-sans text-sm text-ink/60 transition hover:text-gold"
      >
        ← Back to dashboard
      </Link>

      <header
        data-fade
        className="float-in flex flex-wrap items-center justify-between gap-6"
      >
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-semibold tracking-wide text-ink">
            {campaign.title}
          </h1>
          <p className="font-mono text-sm text-gold/70">
            Created {CREATED_FORMAT.format(new Date(campaign.created_at))}
          </p>
        </div>

        {/* A link, so nav-transition.jsx plays the sheet away before the
            table arrives. This is the Dungeon Master's own page, so the seat
            that goes with it is the head of the table. */}
        <PlayButton
          href={campaignTablePath(campaign.id, DUNGEON_MASTER_SEAT)}
          label="Run this campaign"
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
          Built here, on the server, and handed over as rendered output — the
          tabstrip needs the browser, the panels do not. The party panel is the
          exception and says so itself: it owns a form and two actions.
        */}
        <TabStrip
          tabs={CAMPAIGN_TABS}
          label="Campaign sections"
          panels={{
            overview: <OverviewPanel campaign={campaign} />,
            party: <PartyPanel campaignId={campaign.id} members={roster} />,
            // The Dungeon Master's own book, written at the table and read
            // back here the way a character's is on their sheet.
            notes: (
              <NoteList
                notes={notes}
                emptyTitle="No notes yet"
                emptyDescription="Notes you write at the table appear here."
              />
            ),
          }}
        />
      </div>
    </main>
  );
}

function OverviewPanel({ campaign }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          World lore
        </h2>

        {campaign.world_description ? (
          <p className="mt-3 text-sm whitespace-pre-wrap text-ink/75">
            {campaign.world_description}
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink/50 italic">
            Nothing written yet.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          World map
        </h2>

        {campaign.map_url ? (
          <div className="mt-3">
            <CampaignMap url={campaign.map_url} title={campaign.title} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink/50 italic">
            No map for this campaign.
          </p>
        )}
      </section>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { readActivityLog } from "sina/rules/activity";
import { classLabel } from "sina/rules/character";

import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";
import { campaignSheetPath, characterSheetPath } from "@/lib/routes";

import ActivityLog from "./activity-log";
import DiceBoard from "./dice-board";
import DiceRail from "./dice-rail";
import DiceTable from "./dice-table";
import { loadTable } from "./load-table";
import LeaveTable from "./leave-table";
import MapStage from "./map-stage";
import { NOTES_CLASSES, notesEntrance } from "./entrance";
import InventoryPack from "./inventory-pack";
import NotesScroll from "./notes-scroll";
import PartyRail from "./party-rail";
import TableMarks from "./table-marks";
import TableWire from "./table-wire";
import TableTitle from "./table-title";
import WorldLore from "./world-lore";

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  // The seat travels here too, or this and the page below are two different
  // `cache` keys and the campaign is fetched twice for one request.
  const { seat } = await searchParams;
  const loaded = await loadTable(id, seat);

  return {
    title: loaded?.campaign ? `${loaded.campaign.title} · Table` : "Table",
  };
}

/**
 * The face a mark on the map wears — gold and wordmarked for the Dungeon
 * Master, the character's own avatar for anybody else. Resolved here so the
 * browser is handed a class rather than the colour catalogue to derive it from.
 *
 * Null for a character the party no longer holds: the migration's trigger
 * clears those on leaving, and this covers the request already in flight.
 */
function markFace(characterId, members) {
  if (!characterId) {
    return { characterId: null, label: "Party" };
  }

  const member = members.find((one) => one.id === characterId);

  return (
    member && {
      characterId,
      label: member.name,
      initials: characterInitials(member.name),
      colorClass: avatarColorClass(member.color_theme),
    }
  );
}

/**
 * The table itself: the campaign's name overhead, the world in the middle, the
 * party down the right. One screenful, and `overflow-clip` on both axes is what
 * keeps it one — the cards arrive from a viewport off to the right and leave a
 * viewport downward, and neither may raise a scrollbar on the way.
 *
 * `clip` and not `hidden`: `hidden` is a scrolling value, so it promotes the
 * other axis to `auto` and turns this into a scroll container, which put a
 * second scrollbar inside the document's own on any page long enough to scroll.
 *
 * No `min-h-0` beside it, deliberately. A flex item with `min-height: auto`
 * will not shrink under its content, so this box always grows to fit and the
 * clip only ever catches what has been transformed out of view; with `min-h-0`
 * a short window squashed it and the clip ate the health band.
 */
export default async function CampaignTablePage({ params, searchParams }) {
  const { id } = await params;
  // Which chair, from the door they came through. Unrecognised values, and
  // none at all, fall back to the first seat the viewer owns — see readSeat.
  const { seat: requestedSeat } = await searchParams;
  const loaded = await loadTable(id, requestedSeat);

  if (loaded === "signed-out") {
    redirect("/login");
  }

  if (loaded === "auth-unavailable") {
    throw new Error("Could not verify your session (auth_unavailable)");
  }

  // A failed read is not a missing campaign. `campaign_table` answers for
  // everyone entitled to sit here, so no row means no seat — a 404.
  if (loaded.error) {
    throw new Error(`Could not load the campaign (${loaded.error.reason})`);
  }

  if (!loaded.campaign) {
    notFound();
  }

  const { campaign, members, seat, inventory } = loaded;

  // The seat, not the deed: owning this campaign offers the chair, sitting in
  // it is what makes the party's health and the whole board yours.
  const isDungeonMaster = Boolean(seat) && seat.characterId === null;

  const marks = loaded.marks
    .map((mark) => {
      const face = markFace(mark.character_id, members);

      return face && { ...face, x: mark.x, y: mark.y };
    })
    .filter(Boolean);

  /* Every face a token could wear. One somebody else puts down arrives as an id
     and a point — never a name or a colour — so the board needs the set in hand
     to draw it from. */
  const faces = [
    markFace(null, members),
    ...members.map((member) => markFace(member.id, members)),
  ].filter(Boolean);

  /* Read here rather than in the browser: the payload is jsonb, and putting it
     through the rules layer on the server is what keeps a row written by an
     older migration from reaching the panel as "undefined × undefined". */
  const activity = readActivityLog(loaded.activity);

  // Resolved on the server: `classLabel` reaches through the whole ARCHETYPES
  // catalogue, and the rail only ever prints one word of it.
  const roster = members.map((member) => ({
    ...member,
    pathLabel: classLabel(member.class_id),
  }));

  /* The pack draws a name and a face, so only those cross the boundary —
     `roster` beside it carries the race, the path and the hit points. */
  const carriers = members.map(({ id, name, color_theme }) => ({
    id,
    name,
    color_theme,
  }));

  // Out by the door you came in: the seat says which Play button was pressed,
  // and both of those pages are ones this viewer can certainly open.
  const wayOut = seat?.characterId
    ? characterSheetPath(seat.characterId)
    : campaignSheetPath(campaign.id);

  return (
    <main className="grid flex-1 grid-rows-[auto_auto_1fr] gap-4 overflow-clip px-4 py-6 sm:px-6">
      {/* One socket for everything this table tells itself: who is sitting
          down, a bar moved, a token put down. Outside the dice provider and the
          grid both, because the way out and the health band are neither. */}
      <TableWire
        campaignId={campaign.id}
        seatId={seat?.id ?? null}
        // The seat, not the account: a Dungeon Master announces no character
        // even when they own one at this table.
        seatCharacterId={seat?.characterId ?? null}
      >
        {/* Three columns so the title is centred on the viewport rather than on
          what is left beside the way out. The empty third balances the first. */}
        <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <LeaveTable
            href={wayOut}
            className="float-in cursor-pointer justify-self-start font-sans text-sm text-ink/60 transition hover:text-gold"
          />

          <div data-fade className="min-w-0">
            <TableTitle title={campaign.title} />
          </div>
        </div>

        {/*
        A row of their own above the board: sharing the map's column pulled the
        party cards up, since they centre against whatever sits beside them.

        `pb-6` on top of the row gap, because the map's glass mat stands 1.5rem
        proud of the picture — less and the frame sits over the scroll.

        The arrival and departure ride here rather than inside any of the three:
        all are TablePopover, and a shared shell has no business knowing where
        on a page it was put. `data-tuck` is the departure — behind the board
        rather than off the page, which is where they came from.
      */}
        <div
          className={`flex justify-center ${NOTES_CLASSES} ${seat ? "pb-6" : ""}`}
          style={notesEntrance()}
          data-tuck="down"
        >
          {seat && (
            <TableMarks>
              <WorldLore
                title={campaign.title}
                lore={campaign.world_description}
              />
              <NotesScroll campaignId={campaign.id} seat={seat} />
              {/* Split up in the browser; RLS has already decided which
                  packs this viewer was handed. */}
              <InventoryPack
                campaignId={campaign.id}
                seat={{ characterId: seat.characterId, title: seat.title }}
                members={carriers}
                rows={inventory}
                isDungeonMaster={isDungeonMaster}
              />
            </TableMarks>
          )}
        </div>

        {/*
        A grid, and the empty first column is the reason: matching side columns
        straddle the map on the viewport's centre line whether the party is full
        or empty, and the rail keeps its 20rem instead of being squeezed by a
        wide map. 20rem and not 18: the level ring takes 56px out of the name's
        line, and at 18rem a fourteen-letter name no longer fit.
      */}
        {/* The provider renders no element of its own, so the grid below is
          still this row — and it has to stand outside all three columns: the
          rail is pressed in one, the dice land in another, and the result comes
          out from under a card in the third. */}
        <DiceTable
          campaignId={campaign.id}
          seatId={seat?.id ?? null}
          characterId={seat?.characterId ?? null}
          canKeepSecrets={isDungeonMaster}
        >
          {/* `content-start` is load-bearing: this row is the grid's `1fr`, so
            it takes every pixel the rows above do not, and a track with nothing
            told to it stretches — which centred the board, the log and the rail
            in that leftover instead of putting them under the marks. The health
            band used to spend it, so the bug had nowhere to show.

            `items-center` beside it is what makes the three columns straddle. */}
          <div className="grid content-start items-center justify-items-center gap-6 lg:grid-cols-[20rem_minmax(0,1fr)_20rem] lg:gap-8">
            {/* The column that used to be empty. It was there to balance the
                party rail so the board stayed on the viewport's centre line,
                and the log is what it now holds — the same width, so the board
                has not moved. Only for somebody with a chair: a viewer with no
                seat reads nothing else at this table either. */}
            {seat ? (
              <ActivityLog campaignId={campaign.id} entries={activity} />
            ) : (
              <div aria-hidden="true" className="hidden lg:block" />
            )}

            {/* The dice stand immediately to the right of the board, and the
              empty box on the left is what keeps the board itself on the
              viewport's centre line — the same trick the grid outside plays
              with its own first column, one level in. Both are the rail's
              width.

              `gap-10` and not the row's own `gap-3`: the map's glass mat
              stands 1.5rem proud of the picture on every side, so the gap has
              to clear that before it is a gap at all. At 2.5rem the marks sit
              1rem off the frame; at anything under 1.5rem they sit on it. */}
            {/* No `data-fade` on the row: the board and the rail beside it
              leave on their own beats — see panel-fold.js. */}
            <div className="flex w-full min-w-0 items-center justify-center gap-10">
              {seat && <div aria-hidden="true" className="w-14 shrink-0" />}

              <MapStage
                url={campaign.map_url}
                title={campaign.title}
                campaignId={campaign.id}
                marks={marks}
                faces={faces}
                // The token this viewer puts down, drawn before the write so it
                // appears under the pointer at once.
                seat={seat && markFace(seat.characterId, members)}
                canSweep={isDungeonMaster}
              >
                {seat && <DiceBoard />}
              </MapStage>

              {/* The seat, not the deed, decides who may keep a roll back — the
                same line the health band and the board are drawn on. */}
              {seat && <DiceRail canKeepSecrets={isDungeonMaster} />}
            </div>

            {/* Not `data-fade`: the cards carry `data-slide` instead and leave
              the way they arrived. See play/entrance.js. */}
            {/* The seat, not the deed, decides who may award a level. */}
            <PartyRail
              campaignId={campaign.id}
              members={roster}
              isDungeonMaster={isDungeonMaster}
              seatCharacterId={seat?.characterId ?? null}
            />
          </div>
        </DiceTable>
      </TableWire>
    </main>
  );
}

import { notFound, redirect } from "next/navigation";
import { readActivityLog } from "sina/rules/activity";
import {
  characterSize,
  initiativeBonus,
  movementSpeed,
  proficienciesFor,
} from "sina/rules/character-stats";
import { readSpellcasting } from "sina/rules/spellcasting";
import { classLabel } from "sina/rules/character";

import ToastProvider from "@/app/components/ui/toast";
import { diceColorClass } from "@/app/dashboard/character-presentation";
import { CharacterStats } from "@/app/dashboard/character-stats";
import { campaignSheetPath, characterSheetPath } from "@/lib/routes";

import AbilitySheet from "./ability-sheet";
import ActivityLog from "./activity-log";
import AbilityScoreField from "./ability-score-field";
import CharacterVitals from "./character-vitals";
import ChestStage from "./chest-stage";
import DiceBoard from "./dice-board";
import DiceCapsule from "./dice-capsule";
import MapShelfStage from "./map-shelf-stage";
import TokenPalette from "./token-palette";
import TableMaps from "./table-maps";
import DiceRail from "./dice-rail";
import DiceTable from "./dice-table";
import { loadTable } from "./load-table";
import LeaveTable from "./leave-table";
import MapStage from "./map-stage";
import {
  NOTES_CLASSES,
  notesEntrance,
  RAIL_MIRRORED_CLASSES,
  railEntrance,
} from "./entrance";
import InventoryPack from "./inventory-pack";
import NotesScroll from "./notes-scroll";
import FeatureShelf from "./feature-shelf";
import PartyRail from "./party-rail";
import ProficienciesSection from "./proficiencies-section";
import RailMarks from "./rail-marks";
import SessionStage from "./session-stage";
import SpellBook from "./spell-book";
import XpBar from "./xp-bar";
import TableMarks from "./table-marks";
import TableState from "./table-state";
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
 * A section title on the scores sheet. `CharacterStats` writes its own two —
 * Ability scores and Skills — and `XpMeter` its Experience; this is the same
 * one, for the sections on page two that have no component of their own to put
 * it in.
 */
function SheetHeading({ children }) {
  return (
    <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
      {children}
    </h3>
  );
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
      src: member.avatar_url,
      colorClass: diceColorClass(member.dice_color),
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

  const { campaign, members, seat, inventory, spells, purses, containers } =
    loaded;

  // The seat, not the deed: owning this campaign offers the chair, sitting in
  // it is what makes the party's health and the whole board yours.
  const isDungeonMaster = Boolean(seat) && seat.characterId === null;

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
  const carriers = members.map(({ id, name, dice_color, avatar_url }) => ({
    id,
    name,
    dice_color,
    avatar_url,
  }));

  /* The session panel's own list: a name to aim at, and the path, which is what
     `sina/rules/rest` reads to decide what a short rest returns. Built for the
     head of the table alone — nobody else opens that panel. */
  const resters = members.map(({ id, name, class_id }) => ({
    id,
    name,
    class_id,
  }));

  /* The sheets this viewer was handed, once — the scores panel, the vitals
     ribbon and the spellbook all read the same list and RLS has already decided
     it. */
  const sheets = isDungeonMaster
    ? loaded.sheets
    : [seat?.sheet].filter(Boolean);

  /*
   * What the vitals ribbon prints, worked out here for the reason `scorePanels`
   * is: `proficienciesFor` reaches through a table of thirteen paths and the
   * ribbon prints five figures off it.
   *
   * EVERY FIELD BUT THE TALLY IS DERIVED FROM A ROW ONLY A ROUTE RENDER CAN
   * CHANGE — the race, the path and the six scores — so they cross the boundary
   * as plain values. `hitDiceSpent` seeds the store instead, because a short
   * rest moves it from any chair.
   */
  const vitals = Object.fromEntries(
    sheets.map((sheet) => [
      sheet.id,
      {
        classId: sheet.class_id,
        skills: sheet.skills ?? {},
        wisTotal: sheet.ability_wis_total,
        initiative: initiativeBonus(sheet.ability_dex_total),
        speed: movementSpeed(sheet.race),
        size: characterSize(sheet.race),
        proficiencies: proficienciesFor(
          sheet.class_id,
          sheet.custom_proficiencies,
        ),
        hitDiceSpent: sheet.hit_dice_spent ?? 0,
      },
    ]),
  );

  /* Whose numbers this viewer may read, and the panel each opens — the head of
     the table gets the party's, a player their own. Built here and handed over
     rendered: the picker needs the browser, the arithmetic does not. */
  const scorePanels = Object.fromEntries(
    sheets.map((sheet) => {
      const name =
        members.find((one) => one.id === sheet.id)?.name ?? "This character";

      /* Whoever may move this character's numbers: the head of the table, and
         the character's own player. Every writer below re-asks. */
      const own = isDungeonMaster || sheet.id === seat?.characterId;

      return [
        sheet.id,
        {
          /* PAGE ONE — what the numbers ARE. The scores, and the bar they are
             climbing. NO REST HERE: a rest is something a SESSION does, and it
             is the session panel's — two buttons in two panels was one control
             pretending to be two. */
          scores: (
            <div className="flex flex-col gap-4">
              {/* THE SIX AS FIELDS, and only for whoever runs the session: a
                  player may not raise their own Strength past the fifteen
                  points they spent. `set_ability_score` refuses one too, so
                  this is a door rather than the lock. */}
              <CharacterStats
                character={sheet}
                scoreField={
                  isDungeonMaster
                    ? (score) => (
                        <AbilityScoreField
                          campaignId={campaign.id}
                          characterId={sheet.id}
                          ability={score}
                          name={name}
                          total={score.total}
                        />
                      )
                    : null
                }
              />

              {/* Last on the page, and a READ-OUT: the session panel that moves
                  it is the head of the table's, and this is where everybody
                  else finds out where they stand. A Client Component inside a
                  server-rendered panel, because the figure is held in the
                  browser. */}
              <XpBar characterId={sheet.id} name={name} />
            </div>
          ),

          /* PAGE TWO — what they let this character DO. Each section titled the
             way page one's are, in the same face at the same size: two pages of
             one sheet should not be two typographies. */
          vitals: (
            <div className="flex flex-col gap-4">
              <section>
                <SheetHeading>Vitals</SheetHeading>

                <div className="mt-3">
                  <CharacterVitals
                    characterId={sheet.id}
                    name={name}
                    vitals={vitals[sheet.id]}
                  />
                </div>
              </section>

              <section>
                <SheetHeading>Proficiencies</SheetHeading>

                <div className="mt-3">
                  <ProficienciesSection
                    proficiencies={vitals[sheet.id].proficiencies}
                  />
                </div>
              </section>

              <FeatureShelf characterId={sheet.id} name={name} canEdit={own} />
            </div>
          ),
        },
      ];
    }),
  );

  /* What a caster needs above the map, resolved here for the reason
     `scorePanels` is: the arithmetic wants the whole row and the bar wants four
     fields of it. Same audience as the sheets, so RLS has already decided it. */
  const spellcasters = Object.fromEntries(
    sheets.map((sheet) => [
      sheet.id,
      {
        classId: sheet.class_id,
        level: sheet.level,
        slots: sheet.spell_slots ?? {},
        casting: readSpellcasting(sheet),
      },
    ]),
  );

  // In party order, and only those a sheet came back for: a failed read leaves
  // the mark off rather than opening it on nothing.
  const readable = carriers.filter((one) => scorePanels[one.id]);

  // Out by the door you came in: the seat says which Play button was pressed,
  // and both of those pages are ones this viewer can certainly open.
  const wayOut = seat?.characterId
    ? characterSheetPath(seat.characterId)
    : campaignSheetPath(campaign.id);

  return (
    <main className="grid flex-1 grid-rows-[auto_auto_1fr] gap-4 overflow-clip px-4 py-6 sm:px-6">
      {/* Somewhere for a refusal to go once the control that caused it has
          already closed, which at this table is every control: a deed here
          paints before it is written. Outside the socket, because a session
          that expired has to be able to say so too. */}
      <ToastProvider>
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
          {/* Every number a press can move, held in the browser from here down.
            This render is the SEED: nothing below asks the route to render
            again, so it is adopted once and belongs to the table until a real
            refresh lands. See table-state.jsx. */}
          {/* What the board is showing, and the shelf it can be changed to.
            Above TableState rather than in it: the seed down there is every
            number a press can move, and this is a picture — it has its own
            socket message, its own doorbell and no numbers at all. */}
          <TableMaps
            campaignId={campaign.id}
            maps={loaded.maps}
            activeId={campaign.active_map_id}
            /* What a table with nothing chosen is looking at. `campaign_table`
               resolves the same fallback on the server, so the first paint and
               every switch after it agree. */
            worldUrl={campaign.map_url}
          >
            <TableState
              seed={{
                members,
                activity,
                marks: loaded.marks,
                inventory,
                spells,
                purses,
                casters: spellcasters,
                containers,
                containerItems: loaded.containerItems,
                vitals,
                features: loaded.features,
              }}
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

              {/* Renders no element of its own, so the two rows below are still the
          grid's. It reaches up over the marks because the spellbook casts from
          in there and the arena it throws into is down here. */}
              <DiceTable
                campaignId={campaign.id}
                seatId={seat?.id ?? null}
                characterId={seat?.characterId ?? null}
                // What this chair's dice are cast in, null at the head of the
                // table. It rides out with every roll this browser starts.
                diceColor={seat?.diceColor ?? null}
                // For the line shown while the entry is being written; the one
                // the log keeps comes off a row. See write_table_log.
                seatTitle={seat?.title ?? null}
                canKeepSecrets={isDungeonMaster}
              >
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
                        seat={{
                          characterId: seat.characterId,
                          title: seat.title,
                        }}
                        members={carriers}
                        isDungeonMaster={isDungeonMaster}
                      />
                      {readable.length > 0 && (
                        <AbilitySheet
                          label={
                            isDungeonMaster
                              ? "The party’s scores and skills"
                              : `Scores and skills as ${seat.title}`
                          }
                          members={readable}
                          panels={scorePanels}
                        />
                      )}
                      {/* Split up in the browser; RLS has already decided which books
                  this viewer was handed. */}
                      <SpellBook
                        campaignId={campaign.id}
                        seat={{
                          characterId: seat.characterId,
                          title: seat.title,
                        }}
                        members={carriers}
                        casters={spellcasters}
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
                {/* The grid stands inside the provider and outside all three of its
          own columns: the rail is pressed in one, the dice land in another, and
          the result comes out from under a card in the third. */}
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
                    <ActivityLog campaignId={campaign.id} faces={faces} />
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
                    {/* THE HEAD OF THE TABLE'S RAIL — the chest, and the session
                under it. What a player may reach is in the pack above the board,
                and their own experience is under the skills on the scores sheet.

                Empty for everybody else, and the same width either way: it is
                what balances the dice rail so the board keeps the viewport's
                centre line, and it must not move between the two chairs. */}
                    {seat &&
                      (isDungeonMaster ? (
                        /* One column, two marks and ONE panel behind them — the
                         marks above the board are built the same way, and moving
                         between the two morphs a single box rather than closing
                         one and opening another. See rail-marks.jsx.

                         The arrival and the tuck belong to the column rather
                         than to each mark on it. */
                        <div
                          data-tuck="right"
                          style={railEntrance()}
                          className={RAIL_MIRRORED_CLASSES}
                        >
                          <RailMarks>
                            {/* Above the chest: which picture the party is
                              looking at is the first thing a session changes,
                              and the shelf is the head of the table's alone. */}
                            <MapShelfStage campaignId={campaign.id} />

                            <ChestStage
                              campaignId={campaign.id}
                              members={carriers}
                            />

                            {resters.length > 0 && (
                              <SessionStage
                                campaignId={campaign.id}
                                members={resters}
                              />
                            )}

                            {/* Under the session, and only while the board is
                                ruled: a hand of pieces is no use without cells
                                to put them in. See token-palette.jsx. */}
                            <TokenPalette members={carriers} />
                          </RailMarks>
                        </div>
                      ) : (
                        <div aria-hidden="true" className="w-14 shrink-0" />
                      ))}

                    <MapStage
                      url={campaign.map_url}
                      title={campaign.title}
                      campaignId={campaign.id}
                      faces={faces}
                      // Every other chair's comes out from under its own card.
                      cast={seat && <DiceCapsule under />}
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
                    // For the optimistic line alone; `write_table_log` derives
                    // the one that is written down.
                    seatTitle={
                      isDungeonMaster ? "Dungeon Master" : (seat?.title ?? null)
                    }
                  />
                </div>
              </DiceTable>
            </TableState>
          </TableMaps>
        </TableWire>
      </ToastProvider>
    </main>
  );
}

import Link from "next/link";
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

import { ButtonContent, buttonClasses } from "@/app/components/ui/button";
import ToastProvider from "@/app/components/ui/toast";
import { diceColorHex } from "@/app/dashboard/character-presentation";
import { CharacterStats } from "@/app/dashboard/character-stats";
import {
  campaignDisplayPath,
  campaignSheetPath,
  characterSheetPath,
} from "@/lib/routes";

import AbilitySheet from "./ability-sheet";
import ActivityColumn from "./activity-column";
import AtTablePlayer from "./at-table-player";
import AbilityScoreField from "./ability-score-field";
import CharacterVitals from "./character-vitals";
import ChestStage from "./chest-stage";
import CombatBackdrop from "./combat-backdrop";
import CombatStage from "./combat-stage";
import CombatSync from "./combat-sync";
import DiceBoard from "./dice-board";
import DiceCapsule from "./dice-capsule";
import MapShelfStage from "./map-shelf-stage";
import TableMaps from "./table-maps";
import DiceRail from "./dice-rail";
import DesktopTable from "./desktop-table";
import DmMarks from "./dm-marks";
import { loadTable, loadTableCampaign } from "./load-table";
import MapStage from "./map-stage";
import SceneStage from "./scene-stage";
import SceneStaging from "./scene-staging";
import { NOTES_CLASSES, notesEntrance } from "./entrance";
import InventoryPack from "./inventory-pack";
import NotesScroll from "./notes-scroll";
import FeatureShelf from "./feature-shelf";
import PartyRail from "./party-rail";
import PlayerCombatStage from "./player-combat-stage";
import LeaveTable from "./leave-table";
import PhoneTableMode from "./phone-table-mode";
import ProficienciesSection from "./proficiencies-section";
import SessionStage from "./session-stage";
import SpellBook from "./spell-book";
import SpellFlares from "./spell-flares";
import XpBar from "./xp-bar";
import TableMarks from "./table-marks";
import TableState from "./table-state";
import TableWire from "./table-wire";
import TableTitle from "./table-title";
import WorldLore from "./world-lore";

/** For `paintScene`: Server Actions take the page's limit, and a painting can
    run past a minute. Under the three minutes `begin_scene_painting` holds a
    claim for. */
export const maxDuration = 120;

export async function generateMetadata({ params }) {
  const { id } = await params;
  const table = await loadTableCampaign(id);

  return {
    title: table?.data ? `${table.data.title} · Table` : "Table",
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

function markFace(member) {
  return {
    characterId: member.id,
    label: member.name,
    speed: movementSpeed(member.race),
    src: member.avatar_url,
    color: diceColorHex(member.dice_color),
    diceColor: member.dice_color,
  };
}

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
    { characterId: null, label: "Party" },
    ...members.map(markFace),
  ];
  const mapSeat =
    seat && faces.find((face) => face.characterId === seat.characterId);
  const tableSeat = seat && {
    characterId: seat.characterId,
    title: seat.title,
    diceColor: seat.diceColor,
    diceSkins: seat.diceSkins,
    bannerSkins: seat.bannerSkins,
    notes: seat.notes,
  };

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
  const resters = members.map(
    ({ id, name, class_id, avatar_url, dice_color }) => ({
      id,
      name,
      class_id,
      avatar_url,
      dice_color,
    }),
  );

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
                atTable
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
                    campaignId={id}
                    characterId={sheet.id}
                    canEdit={own}
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

  /* OFF THE SHELF AND NOT OFF `campaign.map_url`, which `campaign_table` has
     already resolved to whatever is on the table. What belongs under the lore is
     the WORLD map, whichever picture the session is on — and its id with it, so
     the panel can find the party standing on that one. */
  const worldMap = loaded.maps.find((map) => map.is_world_map) ?? null;
  const tableTools = seat
    ? {
        scores: readable.length > 0 && (
          <AbilitySheet
            label={
              isDungeonMaster
                ? "The party’s scores and skills"
                : `Scores and skills as ${seat.title}`
            }
            members={readable}
            panels={scorePanels}
          />
        ),
        pack: (
          <InventoryPack
            campaignId={campaign.id}
            seat={tableSeat}
            members={carriers}
            isDungeonMaster={isDungeonMaster}
          />
        ),
        spells: (
          <SpellBook
            campaignId={campaign.id}
            seat={tableSeat}
            members={carriers}
            casters={spellcasters}
            isDungeonMaster={isDungeonMaster}
          />
        ),
        notes: <NotesScroll campaignId={campaign.id} seat={tableSeat} />,
        lore: (
          <WorldLore
            title={campaign.title}
            lore={campaign.world_description}
            mapId={worldMap?.id}
            mapUrl={worldMap?.url}
          />
        ),
      }
    : null;

  const dmTools = isDungeonMaster && (
    <>
      <MapShelfStage campaignId={campaign.id} />
      <ChestStage campaignId={campaign.id} members={carriers} />
      {resters.length > 0 && (
        <SessionStage campaignId={campaign.id} members={resters} />
      )}
      <SceneStage faces={faces} />
    </>
  );

  // Out by the door you came in: the seat says which Play button was pressed,
  // and both of those pages are ones this viewer can certainly open.
  const wayOut = seat?.characterId
    ? characterSheetPath(seat.characterId)
    : campaignSheetPath(campaign.id);

  const diceProps = {
    campaignId: campaign.id,
    seatId: seat?.id ?? null,
    characterId: seat?.characterId ?? null,
    diceColor: seat?.diceColor ?? null,
    diceSkin: seat?.diceSkin ?? null,
    seatTitle: seat?.title ?? null,
    canKeepSecrets: isDungeonMaster,
  };

  return (
    <main className="grid flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-clip px-4 py-4 lg:block lg:h-dvh lg:flex-none lg:p-0">
      {/* Somewhere for a refusal to go once the control that caused it has
          already closed, which at this table is every control: a deed here
          paints before it is written. Outside the socket, because a session
          that expired has to be able to say so too. */}
      <ToastProvider>
        {/* One socket for everything this table tells itself: who is sitting
          down, a bar moved, a token put down. Outside every other provider,
          since all of them talk over it. */}
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
            {/* The camera and the directions: the head of the table's alone,
                and never told to the table's channel. */}
            <SceneStaging
              campaignId={campaign.id}
              seed={isDungeonMaster ? loaded.staging : null}
            >
              <TableState
                seed={{
                  members,
                  activity,
                  /* Whether the party is fighting, whose turn it is and which
                   round — three columns off the same row `campaign_table`
                   answers with, so no query was added to load them. */
                  combat: campaign,
                  tokens: loaded.tokens,
                  templates: loaded.templates,
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
                <CombatBackdrop />
                <CombatSync campaignId={campaign.id} />
                <SpellFlares>
                  <PhoneTableMode
                    key={seat?.id ?? "spectator"}
                    diceProps={diceProps}
                    mapUrl={campaign.map_url}
                    desktop={
                      <DesktopTable
                        campaign={campaign}
                        seat={tableSeat}
                        isDungeonMaster={isDungeonMaster}
                        faces={faces}
                        mapSeat={mapSeat}
                        members={roster}
                        carriers={carriers}
                        tools={tableTools}
                        dmTools={dmTools}
                        wayOut={wayOut}
                      />
                    }
                    controller={
                      seat?.characterId && (
                        <AtTablePlayer
                          campaignId={campaign.id}
                          title={campaign.title}
                          lore={campaign.world_description}
                          worldMap={
                            worldMap && { id: worldMap.id, url: worldMap.url }
                          }
                          seat={{ ...tableSeat, speed: mapSeat?.speed }}
                          members={roster}
                          carriers={carriers}
                          faces={faces}
                          casters={spellcasters}
                          panels={scorePanels[seat.characterId]}
                          wayOut={wayOut}
                        />
                      )
                    }
                  >
                    {/* Three columns so the title is centred on the viewport rather than on
          what is left beside the way out. The empty third balances the first. */}
                    <div className="z-20 grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:col-start-1 lg:row-start-1">
                      <LeaveTable
                        href={wayOut}
                        slide="up"
                        className="float-in cursor-pointer justify-self-start font-sans text-sm text-ink/60 transition hover:text-gold max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
                      />

                      <div data-fade className="min-w-0">
                        <TableTitle title={campaign.title} />
                      </div>

                      {isDungeonMaster && (
                        <Link
                          href={campaignDisplayPath(campaign.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          prefetch={false}
                          data-table-arrival-content="up"
                          className={buttonClasses({
                            variant: "secondary",
                            className:
                              "justify-self-end max-sm:justify-self-start",
                          })}
                        >
                          <ButtonContent>Cast to TV</ButtonContent>
                        </Link>
                      )}
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
                      data-table-arrival-content
                      className={`z-20 flex justify-center lg:col-start-1 lg:row-start-2 ${NOTES_CLASSES} ${seat ? "pb-6" : ""}`}
                      style={notesEntrance()}
                      data-tuck="down"
                    >
                      {tableTools && (
                        <TableMarks>
                          {tableTools.lore}
                          {tableTools.notes}
                          {tableTools.pack}
                          {tableTools.scores}
                          {tableTools.spells}
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
                    {/* AT ANY CHAIR THE FIRST COLUMN IS WIDER, by the dice rail
            and its gap: the log, and the head of the table's box over it,
            take the room an empty box beside the board used to balance the
            dice with. The board stays on the viewport's centre line — the
            middle column's centre sits 2.875rem right of it, and the dice
            rail beside the board pulls the board back by exactly that. A
            viewer with no chair has neither log nor dice, so even columns. */}
                    <div
                      className={`grid content-start items-center justify-items-center gap-6 lg:col-start-1 lg:row-start-1 lg:row-end-4 lg:content-center lg:gap-8 ${
                        seat
                          ? "lg:grid-cols-[25.75rem_minmax(0,1fr)_20rem]"
                          : "lg:grid-cols-[20rem_minmax(0,1fr)_20rem]"
                      }`}
                    >
                      {/* The column that used to be empty. It was there to balance the
                party rail so the board stayed on the viewport's centre line,
                and the log is what it now holds. The head of the table's box
                of tools stands over it — the initiative ladder, the maps, the
                scene painter, the chest, the session and the hand of pieces;
                see dm-marks.jsx. Only for somebody with a chair: a viewer with
                no seat reads nothing else at this table either. */}
                      {seat ? (
                        <ActivityColumn campaignId={campaign.id} faces={faces}>
                          {isDungeonMaster ? (
                            <>
                              <DmMarks>{dmTools}</DmMarks>
                              <CombatStage
                                campaignId={campaign.id}
                                faces={faces}
                                members={carriers}
                              />
                            </>
                          ) : (
                            <PlayerCombatStage
                              campaignId={campaign.id}
                              faces={faces}
                              seatCharacterId={seat.characterId}
                            />
                          )}
                        </ActivityColumn>
                      ) : (
                        <div aria-hidden="true" className="hidden lg:block" />
                      )}

                      {/* The dice stand immediately to the right of the board, with
              nothing to balance them on the left: the wider first column of
              the grid outside keeps the board on the viewport's centre line.

              `gap-9` and not the row's own `gap-3`: the map's glass mat
              stands 1.5rem proud of the picture on every side, so the gap has
              to clear that before it is a gap at all. At 2.25rem the marks sit
              a little over half a rem off the frame — every rem past that is
              one the board cannot have; under 1.5rem they sit on it. */}
                      {/* No `data-fade` on the row: the board and the rail beside it
              leave on their own beats — see panel-fold.js. */}
                      {/* The board, and under it what rules the map on it: the
              same 1.5rem of mat to clear, and half a rem of air past it. */}
                      <div className="flex w-full min-w-0 items-center justify-center gap-9 max-sm:flex-col max-sm:gap-6">
                        <MapStage
                          url={campaign.map_url}
                          title={campaign.title}
                          campaignId={campaign.id}
                          faces={faces}
                          // Every other chair's comes out from under its own card.
                          // Keyed, as is the board below: an element crossing to a
                          // Client Component can arrive unmarked as checked, and
                          // React then warns about it as a child in a list.
                          cast={<DiceCapsule workspace="map" />}
                          // The token this viewer puts down, drawn before the write so it
                          // appears under the pointer at once.
                          seat={mapSeat}
                          canSweep={isDungeonMaster}
                          canRule={isDungeonMaster}
                        >
                          {seat && <DiceBoard key="board" />}
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
                          isDungeonMaster
                            ? "Dungeon Master"
                            : (seat?.title ?? null)
                        }
                      />
                    </div>
                  </PhoneTableMode>
                </SpellFlares>
              </TableState>
            </SceneStaging>
          </TableMaps>
        </TableWire>
      </ToastProvider>
    </main>
  );
}

import { coinName } from "@/app/dashboard/currency-presentation";
import { spellLevelLabel } from "@/app/dashboard/spell-presentation";

import DieGlyph from "./dice-glyphs";

/**
 * What the log SAYS, which is Maria's alone. `sina/rules/activity` knows that a
 * `d20` came up 18 and files it under `dice_roll`; the sentence, the colour and
 * the emphasis are decided here — the same seam `rollSentence` is written along
 * in dice-presentation.js.
 *
 * Every class string is LITERAL and must stay so: Tailwind's scanner reads the
 * source rather than the running app, and a class built from a template is one
 * it never sees. Same rule character-presentation.js is written under.
 */

/**
 * The stripe down the left of a row, one per kind of thing that can happen.
 * `border-l-*` and not `border-*`: the row carries a full outline underneath
 * these, and only the longhand overrides one side of it.
 *
 * The two dice entries take the board's own two casts rather than a palette
 * colour of their own — a roll everyone saw is gold and a kept one is arcane,
 * which is exactly what the rail, the rim and the pill are already wearing. The
 * rest have no token, so they are named from Tailwind's palette.
 *
 * Taking something back reads as leaving a pack rather than as arriving in one,
 * so it wears the slate that dropping does and not the blue of a hand-over.
 */
const ACCENTS = {
  dice_roll: "border-l-gold/70",
  secret_dice_roll: "border-l-arcane",
  hp_change: "border-l-orange-500",
  item_used: "border-l-emerald-400",
  item_dropped: "border-l-zinc-500",
  item_transferred: "border-l-sky-400",
  item_granted: "border-l-sky-400",
  item_revoked: "border-l-zinc-500",

  /*
   * The purse has a ramp of its own rather than borrowing the pack's, and it
   * runs one way: the darker the blue, the further the coin is from you.
   *
   *   light — it arrived, and the table is richer for it
   *   mid   — it moved across the table, from one of us to another
   *   dark  — it is gone: spent on something, or taken back by the table
   *
   * So a player can read their own history down the stripe without reading a
   * word of it, which is what a colour in this panel is for.
   */
  coin_granted: "border-l-sky-400",
  coin_transferred: "border-l-blue-500",
  coin_spent: "border-l-blue-800",
  coin_revoked: "border-l-blue-800",

  /* The arcane violet the kept roll wears, held back a step. */
  spell_cast: "border-l-arcane/70",

  /* Teal because nothing else in this panel is: a chest APPEARS, and the line
     has to be findable without being read. Light for it arriving in front of
     the party, dark for it leaving the chest. */
  chest_revealed: "border-l-teal-300",
  chest_looted: "border-l-teal-600",

  /* One step darker than an item's: what moved is the whole bag. */
  bag_transferred: "border-l-sky-600",
};

/**
 * The one action with two stripes: everything else here means one thing
 * whichever way it went, and levelling up and down are opposite events. Warm
 * yellow gained, the brown at the far end of the same ramp taken back.
 */
const LEVEL_ACCENTS = {
  up: "border-l-amber-400",
  down: "border-l-amber-800",
};

/** The entry rather than its action: only the level's needs to look inside. */
export function accentClass(entry) {
  if (entry.action === "level_change") {
    return entry.delta > 0 ? LEVEL_ACCENTS.up : LEVEL_ACCENTS.down;
  }

  return ACCENTS[entry.action] ?? "border-l-gold/70";
}

/**
 * How each stack movement is announced, and which way round it reads. `into`
 * is the preposition before the second name — "granted 2× Rope TO Fern", but
 * "took 2× Rope FROM Fern" — and null for the two that name nobody.
 */
const ITEM_PHRASES = {
  item_used: { verb: "used", into: null },
  item_dropped: { verb: "dropped", into: null },
  item_transferred: { verb: "transferred", into: "to" },
  item_granted: { verb: "granted", into: "to" },
  item_revoked: { verb: "took", into: "from" },
};

/** The same four shapes for a purse. "Spent" rather than "used" is the coin. */
const COIN_PHRASES = {
  coin_spent: { verb: "spent", into: null },
  coin_transferred: { verb: "transferred", into: "to" },
  coin_granted: { verb: "granted", into: "to" },
  coin_revoked: { verb: "took", into: "from" },
};

/** The container in a sentence, which is a name rather than a thing counted. */
function Container({ name }) {
  return <span className={EMPHASIS_CLASSES}>{name}</span>;
}

/** A name other than the actor's: the same secondary gold the actor wears. */
const NAME_CLASSES = "font-display font-semibold tracking-wide text-gold/70";

/** Anything the eye should land on inside a sentence — a stack, a number. */
const EMPHASIS_CLASSES = "font-semibold text-ink";

/**
 * The die, drawn at the line's own size, with its name beside it for anybody
 * who cannot see the drawing — `DieGlyph` is `aria-hidden`, so without this a
 * roll reads as "Fern rolled 18 with".
 *
 * `size-3.5` is 14px, which is `text-sm`: the glyph is a word in this sentence
 * and should stand as tall as the ones either side of it.
 */
function Die({ die }) {
  return (
    <>
      <DieGlyph
        die={die}
        className="inline-block size-3.5 shrink-0 align-[-0.15em]"
      />
      <span className="sr-only">{die}</span>
    </>
  );
}

/**
 * The change, signed. Emerald for healing and warm amber for harm — the one
 * place in this panel where a colour carries meaning rather than category — and
 * plain text rather than a badge, so it sits in the sentence the way the roll's
 * own number does. The true minus sign, as the health band's stepper uses.
 */
function HitPoints({ delta }) {
  const healed = delta > 0;

  return (
    <span
      className={`font-semibold tabular-nums ${
        healed ? "text-emerald-300" : "text-orange-300"
      }`}
    >
      {healed ? "+" : "−"}
      {Math.abs(delta)}
    </span>
  );
}

/** The stack that moved, as a table says it: "2× Potion of Healing". */
function Stack({ quantity, item }) {
  return (
    <span className={EMPHASIS_CLASSES}>
      <span className="tabular-nums">{quantity}×</span> {item}
    </span>
  );
}

/**
 * The coins that moved: "120 Gold". The metal's full name, exactly as the
 * capsules in the drawer carry it — nobody at a table says "see pea", and a
 * screen reader saying it was the reason this panel used to need an `sr-only`
 * twin beside the abbreviation.
 */
function Coins({ amount, coin }) {
  return (
    <span className={EMPHASIS_CLASSES}>
      <span className="tabular-nums">{amount}</span> {coinName(coin)}
    </span>
  );
}

/**
 * Whose name the line opens with: the actor's, except for a level. That
 * exception is grammar rather than credit — `record_campaign_activity` writes
 * `level_change` only from the head of the table, so the actor is always
 * "Dungeon Master" and the sentence is about the character.
 */
function opensWith(entry) {
  return entry.action === "level_change" ? entry.target : entry.actor;
}

/** One entry, as a sentence. */
export default function ActivityLine({ entry }) {
  return (
    <p className="text-sm leading-relaxed text-ink/75">
      <span className={NAME_CLASSES}>{opensWith(entry)}</span>{" "}
      <Body entry={entry} />
    </p>
  );
}

function Body({ entry }) {
  if (entry.action === "secret_dice_roll") {
    return (
      <>
        rolled <Die die={entry.die} /> in secret
      </>
    );
  }

  if (entry.action === "dice_roll") {
    return (
      <>
        rolled <span className={EMPHASIS_CLASSES}>{entry.value}</span> with{" "}
        <Die die={entry.die} />
      </>
    );
  }

  /*
   * Four sentences, from two questions: was anybody else involved, and did the
   * bar go up or down. Somebody moving their own hit points lost or gained
   * them; somebody moving another character's dealt or gave them, and the
   * database only writes a `target` for that second case.
   */
  // The one sentence here that opens with somebody other than its actor —
  // see `opensWith`.
  if (entry.action === "level_change") {
    return (
      <>
        leveled {entry.delta > 0 ? "up" : "down"} to Lvl{" "}
        <span className={EMPHASIS_CLASSES}>{entry.level}</span>
      </>
    );
  }

  if (entry.action === "hp_change") {
    const healed = entry.delta > 0;

    if (!entry.target) {
      return (
        <>
          {healed ? "gained" : "lost"} <HitPoints delta={entry.delta} /> HP
        </>
      );
    }

    return (
      <>
        {healed ? "gave" : "dealt"} <HitPoints delta={entry.delta} /> HP to{" "}
        <span className={NAME_CLASSES}>{entry.target}</span>
      </>
    );
  }

  /* No second half: a spell is cast at the table, not at a character. "at 5th
     Level" is the SLOT it came out of — a Magic Missile at third is a different
     event from one at first — and a cantrip comes out of none. */
  if (entry.action === "spell_cast") {
    return (
      <>
        cast <span className={EMPHASIS_CLASSES}>{entry.spell}</span>
        {entry.level > 0 && <> at {spellLevelLabel(entry.level)}</>}
        <Effect damage={entry.damage} save={entry.save} />
      </>
    );
  }

  /* Named where one character was shown it, counted where several were:
     `reveal_chest` writes a `targetName` only when there is one name to say. */
  if (entry.action === "chest_revealed") {
    return (
      <>
        revealed <Container name={entry.container} />
        {entry.target ? (
          <>
            {" to "}
            <span className={NAME_CLASSES}>{entry.target}</span>
          </>
        ) : (
          <> to {entry.shown} of the party</>
        )}
      </>
    );
  }

  /* No second half: it came from the world, not from anybody at the table. */
  if (entry.action === "chest_looted") {
    return (
      <>
        took <Stack quantity={entry.quantity} item={entry.item} /> from{" "}
        <Container name={entry.container} />
      </>
    );
  }

  /* All second half: the bag moved whole, and who has it now is the rest. */
  if (entry.action === "bag_transferred") {
    return (
      <>
        handed over <Container name={entry.container} /> to{" "}
        <span className={NAME_CLASSES}>{entry.target}</span>
      </>
    );
  }

  /* The purse and the pack say the same four things in the same order, so the
     only difference between the two branches is what moved. */
  if (COIN_PHRASES[entry.action]) {
    const { verb, into } = COIN_PHRASES[entry.action];

    return (
      <>
        {verb} <Coins amount={entry.amount} coin={entry.coin} />
        <Addressed into={into} target={entry.target} />
      </>
    );
  }

  const { verb, into } = ITEM_PHRASES[entry.action] ?? {};

  return (
    <>
      {verb} <Stack quantity={entry.quantity} item={entry.item} />
      <Addressed into={into} target={entry.target} />
    </>
  );
}

/** "10d6 Fire ➔ 34 · DC 15 DEX save" — either, both, or neither. */
function Effect({ damage, save }) {
  if (!damage && !save) {
    return null;
  }

  return (
    <span className="text-ink/45">
      {" ("}
      {damage}
      {damage && save ? " · " : ""}
      {save}
      {")"}
    </span>
  );
}

/** "…to Fern", "…from Fern", or nothing at all for the two that name nobody. */
function Addressed({ into, target }) {
  if (!into || !target) {
    return null;
  }

  return (
    <>
      {" "}
      {into} <span className={NAME_CLASSES}>{target}</span>
    </>
  );
}

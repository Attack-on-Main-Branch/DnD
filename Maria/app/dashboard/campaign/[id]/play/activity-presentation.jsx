import { CONDITIONS } from "sina/rules/conditions";

import { conditionDress } from "@/app/dashboard/condition-presentation";

import { coinName } from "@/app/dashboard/currency-presentation";
import { spellLevelLabel } from "@/app/dashboard/spell-presentation";

import DieGlyph from "./dice-glyphs";
import { diceName } from "./dice-presentation";

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
  /* One step back from a hit point's own orange: what moved is the FRAME the
     bar is drawn in, not anything that happened to the character inside it. */
  max_hp_change: "border-l-orange-300",
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

  /* The emerald the experience bar wears, and one step back from it for the
     rest that fills every other bar on the page. */
  xp_change: "border-l-emerald-400",
  rest_taken: "border-l-emerald-700",

  /*
   * The four at zero hit points, on a ramp of their own: rose is the end of
   * somebody, and nothing else in this panel is allowed near it.
   *
   *   bright rose — the blow that skipped the saves, which is the loudest
   *   dark rose   — the third failure, which is quieter because it was coming
   *   emerald     — the way back, the same green the bar fills in
   *
   * `death_save` has none here: a save is read by what it came to rather than
   * by what it was, and `accentClass` looks inside for it.
   */
  instant_death: "border-l-rose-500",
  character_died: "border-l-rose-900",
  character_revived: "border-l-emerald-400",

  /* The two that have no colour of their own here: a condition brings one, and
     `accentClass` looks inside for it. Slate is the fallback for a key this
     catalogue has lost. */
  condition_applied: "border-l-slate-400",
  condition_removed: "border-l-slate-600",

  /* Brighter than `character_died`'s deep rose on purpose: that line is quiet
     because it was coming, and this is the red the frame has just put on. */
  combat_started: "border-l-rose-500",
  combat_ended: "border-l-emerald-600",
};

/**
 * The stripe a condition line wears is the CONDITION's, which is the whole
 * point of the catalogue carrying colours: "Frightened" reads purple in the
 * badge on the card and purple down the edge of the line that applied it.
 *
 * Literal strings, one per condition, and they must stay so — a class built
 * from a template is a class Tailwind's scanner never sees. Same rule the
 * catalogue itself is written under.
 */
const CONDITION_ACCENTS = {
  blinded: "border-l-slate-400",
  charmed: "border-l-pink-400",
  deafened: "border-l-sky-300",
  frightened: "border-l-purple-400",
  grappled: "border-l-orange-400",
  incapacitated: "border-l-rose-500",
  invisible: "border-l-cyan-300",
  paralyzed: "border-l-yellow-400",
  petrified: "border-l-stone-400",
  poisoned: "border-l-emerald-400",
  prone: "border-l-amber-500",
  restrained: "border-l-zinc-400",
  stunned: "border-l-amber-300",
  unconscious: "border-l-indigo-400",
  exhaustion: "border-l-red-500",
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

/**
 * What a death save came to, which is the only thing about it worth a colour:
 * standing up is the bar's emerald, and everything short of it is the amber a
 * character on zero hit points is already wearing on the rail.
 */
const SAVE_ACCENTS = {
  revived: "border-l-emerald-400",
  success: "border-l-emerald-600",
  failure: "border-l-amber-500",
  critical_failure: "border-l-amber-700",
};

/** The entry rather than its action: two of these need to look inside. */
export function accentClass(entry) {
  if (entry.action === "level_change") {
    return entry.delta > 0 ? LEVEL_ACCENTS.up : LEVEL_ACCENTS.down;
  }

  if (entry.action === "death_save") {
    return SAVE_ACCENTS[entry.outcome] ?? ACCENTS.hp_change;
  }

  if (
    entry.action === "condition_applied" ||
    entry.action === "condition_removed"
  ) {
    return CONDITION_ACCENTS[entry.condition] ?? ACCENTS[entry.action];
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

/**
 * What the table is told a face came to. "Stabilised" rather than "revived" for
 * the third success and the natural 20 alike: what happened is that somebody
 * stopped dying, and which of the two ways they got there is on the die beside
 * it.
 */
const SAVE_WORDS = {
  revived: "stabilised",
  success: "success",
  failure: "failure",
  critical_failure: "critical failure",
};

/** One of the fifteen, wearing the colour the badge on the card wears. */
function Condition({ held }) {
  const dressed = conditionDress(held);

  return (
    <span className={`font-semibold ${dressed?.color ?? "text-ink"}`}>
      {CONDITIONS[held]?.name ?? held}
    </span>
  );
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
function Die({ die, count }) {
  return (
    <>
      {/* One glyph however many were thrown, with the count in front of it the
          way a table writes them: "3d6". */}
      {count > 1 && <span aria-hidden="true">{count}</span>}
      <DieGlyph
        die={die}
        className="inline-block size-3.5 shrink-0 align-[-0.15em]"
      />
      <span className="sr-only">{diceName(die, count)}</span>
    </>
  );
}

/**
 * Experience, signed the way a hit point is and in the bar's own emerald. Taken
 * back is the ink the rest of the sentence is in rather than a warning colour:
 * a correction is not a wound.
 */
function Experience({ delta }) {
  return (
    <span
      className={`font-semibold ${delta > 0 ? "text-emerald-300" : "text-ink"}`}
    >
      {delta > 0 ? "+" : "−"}
      {Math.abs(delta)}
    </span>
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
 * Whose name the line opens with: the actor's, except where the sentence is
 * ABOUT somebody else — a level awarded, and the maximum that moved with it.
 * Grammar rather than credit: the character is what changed, and the actor is
 * the Dungeon Master who changed them.
 *
 * A rung climbed on somebody's OWN experience carries no target, and then the
 * actor is the character and the line opens with them like every other.
 */
/* The three at zero hit points join them, and for the same reason: a Dungeon
   Master calling out the blow is not the one it happened to. A revival is the
   exception and stays out — "the Dungeon Master revived Frieren" is a sentence
   about the person who did it. */
const ABOUT_THE_TARGET = new Set([
  "level_change",
  "max_hp_change",
  "instant_death",
  "death_save",
  "character_died",
]);

function opensWith(entry) {
  return ABOUT_THE_TARGET.has(entry.action) && entry.target
    ? entry.target
    : entry.actor;
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
        rolled <Die die={entry.die} count={entry.count} /> in secret
      </>
    );
  }

  if (entry.action === "dice_roll") {
    return (
      <>
        rolled <span className={EMPHASIS_CLASSES}>{entry.value}</span> with{" "}
        <Die die={entry.die} count={entry.count} />
      </>
    );
  }

  /*
   * The four at zero. Each opens with the character it happened to — see
   * `ABOUT_THE_TARGET` — except the last, which opens with whoever did it.
   */
  if (entry.action === "instant_death") {
    return (
      <>
        suffered <span className={EMPHASIS_CLASSES}>massive damage</span> and
        died instantly!
      </>
    );
  }

  if (entry.action === "death_save") {
    return (
      <>
        rolled <span className={EMPHASIS_CLASSES}>{entry.roll}</span> on a{" "}
        <Die die="d20" count={1} /> death save ({SAVE_WORDS[entry.outcome]})
      </>
    );
  }

  if (entry.action === "character_died") {
    return <>succumbed to their wounds and died!</>;
  }

  /* Both open on "Dungeon Master", the only chair that can have written
     either. */
  if (entry.action === "combat_started") {
    return (
      <>
        called for{" "}
        <span className="font-semibold text-rose-300">initiative</span> — the
        fight begins!
      </>
    );
  }

  if (entry.action === "combat_ended") {
    return (
      <>
        called the fight —{" "}
        <span className="font-semibold text-emerald-300">combat has ended</span>
        .
      </>
    );
  }

  /* The condition in its own colour, and the target named either way — a
     Dungeon Master is never the one it happened to. */
  if (entry.action === "condition_applied") {
    return (
      <>
        applied <Condition held={entry.condition} /> to{" "}
        <span className={NAME_CLASSES}>{entry.target}</span>
      </>
    );
  }

  if (entry.action === "condition_removed") {
    return (
      <>
        removed <Condition held={entry.condition} /> from{" "}
        <span className={NAME_CLASSES}>{entry.target}</span>
      </>
    );
  }

  if (entry.action === "character_revived") {
    return (
      <>
        revived <span className={NAME_CLASSES}>{entry.target}</span> back to{" "}
        <span className={EMPHASIS_CLASSES}>1</span> HP!
      </>
    );
  }

  /* The frame the bar is drawn in, and the rung that decided it. No direction:
     what it came TO is the fact, and the bar beside it already shows where that
     left them. */
  if (entry.action === "max_hp_change") {
    return (
      <>
        Max HP updated to{" "}
        <span className={EMPHASIS_CLASSES}>{entry.maxHp}</span> (Lvl{" "}
        {entry.level})
      </>
    );
  }

  /*
   * Four sentences, from two questions: was anybody else involved, and did the
   * bar go up or down. Somebody moving their own hit points lost or gained
   * them; somebody moving another character's dealt or gave them, and the
   * database only writes a `target` for that second case.
   */
  // The one sentence here that can open with somebody other than its actor —
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

  /**
   * Experience, and the two sentences a `targetName` decides between: somebody
   * who earned it, and the head of the table who handed it out. `the party` is
   * the database's own fixed string for a grant to everybody at once.
   */
  if (entry.action === "xp_change") {
    const gained = entry.delta > 0;

    if (!entry.target) {
      return (
        <>
          {gained ? "gained" : "lost"} <Experience delta={entry.delta} /> XP
        </>
      );
    }

    return (
      <>
        {gained ? "granted" : "took"} <Experience delta={entry.delta} /> XP{" "}
        {gained ? "to" : "from"}{" "}
        <span className={NAME_CLASSES}>{entry.target}</span>
      </>
    );
  }

  /* And a rest, which is a thing done rather than given: no target is somebody
     resting their own character, and a name is the head of the table calling
     one for them or for the party. */
  if (entry.action === "rest_taken") {
    return (
      <>
        completed a{" "}
        <span className={EMPHASIS_CLASSES}>
          {entry.restType === "long" ? "Long" : "Short"} Rest
        </span>
        {entry.target && (
          <>
            {" for "}
            <span className={NAME_CLASSES}>{entry.target}</span>
          </>
        )}
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

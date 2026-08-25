/**
 * How a container looks and how it is spoken about, so the Create tab, the
 * chest drawer, a player's bags and the log cannot drift.
 *
 * Class strings are LITERAL and must stay so: Tailwind's scanner reads the
 * source, not the running app.
 */

/** The two kinds, in the order the Create tab offers them. */
export const CONTAINER_KINDS = [
  {
    value: "bag",
    label: "Traveller’s Bag",
    hint: "Carried by one character, and handed over whole.",
    placeholder: "Bag of Holding",
  },
  {
    value: "chest",
    label: "Loot Chest",
    hint: "Sits in the world until you reveal it to the party.",
    placeholder: "Crypt Treasure Chest",
  },
];

function containerKind(type) {
  return CONTAINER_KINDS.find((kind) => kind.value === type) ?? null;
}

export function containerTypeLabel(type) {
  return containerKind(type)?.label ?? "Container";
}

/**
 * What a bag with nobody holding it says where a carrier's name would go. Not
 * "All party": an unowned bag is not the party's jointly, it is simply not in
 * anybody's hands yet, and the only thing that can happen to it is being given.
 */
export const NOBODY_YET = "Nobody yet";

/**
 * A container card. `NESTED_CARD_CLASSES` is for something you press; these
 * hold their own controls, so they take the tint without the hover.
 */
export const CONTAINER_CARD_CLASSES =
  "rounded-xl border border-gold/15 bg-surface/60 p-3.5 " +
  "shadow-[inset_0_1px_0_rgba(255,223,156,0.07)]";

/** The kind tag, the item category tag's twin. */
const TAG_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 " +
  "font-mono text-[10px] tracking-[0.14em] uppercase";

const BAG_TAG_CLASSES = `${TAG_BASE} border-gold/25 bg-gold/10 text-gold/80`;

const CHEST_TAG_CLASSES = `${TAG_BASE} border-arcane/35 bg-arcane/10 text-arcane/90`;

export function containerTagClasses(type) {
  return type === "chest" ? CHEST_TAG_CLASSES : BAG_TAG_CLASSES;
}

/**
 * The reveal switch, the one control here that wears emerald: gold means "you
 * may press this" everywhere else, and a chest open to the party is a STATE
 * rather than an invitation — the argument the dice rail's veil makes for
 * violet.
 */
export const REVEALED_CLASSES =
  "border-emerald-500 bg-emerald-500/20 text-emerald-200 " +
  "shadow-[0_0_18px_-6px_rgba(16,185,129,0.8)] hover:bg-emerald-500/30";

export const HIDDEN_CLASSES =
  "border-gold/25 bg-surface/40 text-ink/70 hover:border-gold/55 hover:text-gold";

/** The names while they fit, a count once they do not. */
function audienceLabel(visibleTo, members) {
  const named = (visibleTo ?? [])
    .map((id) => members.find((member) => member.id === id)?.name)
    .filter(Boolean);

  if (named.length === 0) {
    return "Nobody yet";
  }

  if (named.length === members.length) {
    return "The whole party";
  }

  return named.length <= 2
    ? named.join(" and ")
    : `${named.length} of the party`;
}

/**
 * A chest's whole state in one line: the switch and its audience only mean
 * anything together. The chosen names are still said while it is hidden —
 * they are what the next press will reveal it to.
 */
export function chestAudienceLine(container, members) {
  if (container.isRevealed) {
    return `Revealed to ${audienceLabel(container.visibleTo, members)}`;
  }

  return container.visibleTo.length > 0
    ? `Hidden — ${audienceLabel(container.visibleTo, members)} chosen`
    : "Hidden — nobody chosen yet";
}

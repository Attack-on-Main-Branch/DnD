import { listCampaignSpells } from "sina/data/spells";
import {
  CANTRIP_LEVEL,
  DAMAGE_TYPES,
  MAX_SPELL_DESCRIPTION_LENGTH,
  MAX_SPELL_HIGHER_LEVEL_LENGTH,
  MAX_SPELL_LEVEL,
} from "sina/rules/spells";

import { rowSpell } from "@/app/dashboard/spell-presentation";
import { memoizeAsync } from "@/lib/async-cache.mjs";
import { logFailure } from "@/lib/errors";

import {
  cacheCatalogue,
  RESULTS,
  searchCatalogue,
  upstream,
} from "../../catalogue-search";

/**
 * The SRD's spells and the campaign's own, searchable from the spellbook.
 *
 * The item search next door, for the same reasons: a route rather than a Server
 * Action because it is a READ on every keystroke, and proxied so thirty players
 * searching are not thirty browsers on somebody else's free API.
 * `/api/2024/...` for the 2024 rules; the bare path is a 301 to the 2014 ones.
 *
 * `campaign_spells` is not cached at all — at most sixty rows, one indexed read
 * away, and unlike the SRD they change.
 */
const catalogue = cacheCatalogue(async () => {
  const list = await upstream("spells");
  return (list?.results ?? []).map((spell) => ({
    slug: spell.index,
    name: spell.name,
    lower: String(spell.name ?? "").toLowerCase(),
    level: Number.isInteger(spell.level) ? spell.level : null,
    path: `spells/${spell.index}`,
  }));
});

/**
 * The column's bound, taken at the last word: a hard slice ends "must make a
 * Dexterity sav", which reads as a bug rather than a limit.
 */
function clip(text, limit = MAX_SPELL_DESCRIPTION_LENGTH) {
  if (text.length <= limit) {
    return text;
  }

  const cut = text.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");

  return `${lastSpace > limit * 0.75 ? cut.slice(0, lastSpace) : cut}…`;
}

/** One string with newlines between paragraphs, or an array of them. */
function paragraphs(text) {
  const lines = Array.isArray(text) ? text : String(text ?? "").split("\n");

  return lines
    .map((line) =>
      String(line)
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Cantrips and a few spells write their scaling into `description`, not `higher_level`. */
const UPGRADE = /\s*(?:Cantrip Upgrade|Using a Higher-Level Spell Slot)\.\s*/;

function ruleAndUpgrade(spell) {
  const text = String(spell?.description ?? "");
  const found = text.match(UPGRADE);

  const rule = found ? text.slice(0, found.index) : text;
  const inline = found ? text.slice(found.index + found[0].length) : "";

  return {
    rule: paragraphs(rule),
    upgrade: paragraphs(
      [spell?.higher_level, inline].filter(Boolean).join("\n"),
    ),
  };
}

/** "Action" → "1 action"; a trigger after the comma is too long for its cell, so it opens the rule. */
function castingOf(spell) {
  const text = String(spell?.casting_time ?? "").trim();
  const comma = text.indexOf(",");

  const time = (comma === -1 ? text : text.slice(0, comma)).replace(
    /^(?:Bonus Action|Reaction|Action)\b/i,
    (word) => `1 ${word.toLowerCase()}`,
  );

  const trigger = comma === -1 ? "" : text.slice(comma + 1).trim();

  return {
    castingTime: time,
    trigger: trigger
      ? `Cast as a ${time.replace(/^1 /, "")}, ${trigger.replace(/\.?$/, ".")}`
      : "",
  };
}

/** Some ranges arrive with the components glued on: "Touch Component: V, S". */
function rangeOf(spell) {
  return String(spell?.range ?? "")
    .replace(/\s+Components?:.*$/i, "")
    .trim();
}

function durationOf(spell) {
  const text = String(spell?.duration ?? "").trim();

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

const DAMAGE_TYPE = `(?:${DAMAGE_TYPES.join("|")})`;

/** "Acid, Cold, Fire, Lightning, or Thunder" as well as a type alone. */
const DAMAGE_CHOICE = `${DAMAGE_TYPE}(?:,? (?:or )?${DAMAGE_TYPE})*`;

/**
 * Damage the prose states without a `damage` field: "10d6 + 40 Force damage",
 * "Force damage equal to 4d12 plus …", "takes 3d8 damage of the chosen type".
 */
const PROSE_DAMAGE = [
  [
    new RegExp(`(\\d+d\\d+(?: ?\\+ ?\\d+)?) (${DAMAGE_CHOICE}) damage`),
    (found) => ({ dice: found[1], type: found[2] }),
  ],
  [
    new RegExp(`(${DAMAGE_CHOICE}) damage equal to (\\d+d\\d+)`),
    (found) => ({ dice: found[2], type: found[1] }),
  ],
  [/tak(?:es|ing) (\d+d\d+) damage/, (found) => ({ dice: found[1], type: "" })],
];

/** The one row the 2024 SRD tabulates is the spell's own level ("0" for a cantrip). */
function baseDamage(spell, rule) {
  const bySlot = spell?.damage?.damage_at_slot_level ?? {};
  const dice = bySlot[String(spell?.level)] ?? Object.values(bySlot)[0];

  if (dice) {
    return { dice, type: spell.damage.damage_type?.name ?? "" };
  }

  const found = PROSE_DAMAGE.map(([pattern, read]) => {
    const match = rule.match(pattern);

    return match ? { index: match.index, ...read(match) } : null;
  })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)[0];

  return found ? { dice: found.dice, type: found.type } : null;
}

/** "Hit Points equal to 2d8 plus …" or "regain 2d8 Hit Points". */
function baseHealing(rule) {
  const found = rule.match(
    /Hit Points equal to (\d+d\d+)|regains? (\d+d\d+) Hit Points/,
  );

  return found?.[1] ?? found?.[2] ?? "";
}

/**
 * "increases by 1d6 for each spell slot level above 3". Takes the sentence's
 * FIRST dice: Wall of Ice's second step is the frigid air's, not the wall's.
 */
const SLOT_STEP =
  /increases? by (\d+)d(\d+)[^.]*?for (?:each|every) (?:spell )?slot level above (\d)/i;

/**
 * The step spelled out as `{ 3: "8d6", 4: "9d6", … }` so an upcast rolls the
 * right dice. Empty when the step's die differs from the base's.
 */
function slotTable(base, upgrade, level) {
  const from = String(base ?? "").match(/^(\d+)d(\d+)( ?\+ ?\d+)?$/);
  const step = upgrade.match(SLOT_STEP);

  if (!from || !step || step[2] !== from[2] || Number(step[3]) !== level) {
    return {};
  }

  const table = {};

  for (let slot = level; slot <= MAX_SPELL_LEVEL; slot++) {
    const count = Number(from[1]) + Number(step[1]) * (slot - level);

    table[slot] = `${count}d${from[2]}${from[3] ?? ""}`;
  }

  return table;
}

/** "levels 5 (2d10), 11 (3d10), and 17 (4d10)", keyed on character level. */
function cantripTable(base, upgrade) {
  if (!/^\d+d\d+$/.test(String(base ?? ""))) {
    return {};
  }

  const rows = [...upgrade.matchAll(/\b(\d+) \((\d*)d(\d+)\)/g)];

  if (rows.length === 0) {
    return {};
  }

  const table = { 1: base };

  for (const [, at, count, die] of rows) {
    table[at] = `${count || 1}d${die}`;
  }

  return table;
}

const ABILITIES =
  "Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";

/** A save the spell forces — Haste's "Advantage on Dexterity saving throws" is not one. */
const FORCED_SAVE = new RegExp(
  `(?:make|makes|making|succeed on|succeeds on|fail|fails) an? (${ABILITIES}) saving throw`,
  "i",
);

/** "DEX save" or "Ranged spell attack". The 2024 SRD has no `dc` field. */
function attackSaveLine(spell, rule) {
  if (spell?.attack_type) {
    const kind = String(spell.attack_type);

    return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} spell attack`;
  }

  const save = rule.match(FORCED_SAVE);

  return save ? `${save[1].slice(0, 3).toUpperCase()} save` : "";
}

/** What the index alone already knows: enough to show and enough to shelve. */
function outline(entry) {
  return {
    slug: entry.slug,
    name: entry.name,
    // Null where the index has stopped carrying levels, which leaves nothing
    // to file the spell under. The drawer refuses to learn one.
    level: entry.level,
    school: "",
    castingTime: "",
    range: "",
    components: "",
    material: "",
    duration: "",
    concentration: false,
    ritual: false,
    attackSave: "",
    damage: "",
    description: "",
    higherLevel: "",
    classes: "",
    damageByLevel: {},
    healByLevel: {},
  };
}

const detail = memoizeAsync(
  async function detail(entry) {
    const spell = await upstream(entry.path);

    const level = Number.isInteger(spell?.level) ? spell.level : entry.level;
    const { rule, upgrade } = ruleAndUpgrade(spell);
    const { castingTime, trigger } = castingOf(spell);
    const damage = baseDamage(spell, rule);

    const card = {
      slug: entry.slug,
      name: spell?.name ?? entry.name,
      level,
      school: spell?.school?.name ?? "",
      castingTime,
      range: rangeOf(spell),
      components: (spell?.components ?? []).join(", "),
      material: spell?.material ?? "",
      duration: durationOf(spell),
      concentration: Boolean(spell?.concentration),
      ritual: Boolean(spell?.ritual),
      attackSave: attackSaveLine(spell, rule),
      damage: damage ? `${damage.dice} ${damage.type}`.trim() : "",
      description: clip([trigger, rule].filter(Boolean).join("\n\n")),
      higherLevel: clip(upgrade, MAX_SPELL_HIGHER_LEVEL_LENGTH),
      classes: (spell?.classes ?? [])
        .map((one) => one?.name)
        .filter(Boolean)
        .join(", "),
      // Keyed on character level for a cantrip and on slot level otherwise;
      // `spellDiceAt` is what knows which.
      damageByLevel:
        level === CANTRIP_LEVEL
          ? cantripTable(damage?.dice, upgrade)
          : slotTable(damage?.dice, upgrade, level),
      healByLevel: slotTable(baseHealing(rule), upgrade, level),
    };

    return card;
  },
  (entry) => entry.slug,
);

export async function GET(request) {
  return searchCatalogue(request, {
    kind: "spell",
    catalogue,
    campaignEntries: campaignSpells,
    detail,
    outline,
  });
}

/**
 * `isCustom` routes these down a different path when taught — see `readTaught`.
 * RLS is the scope: a caller naming a campaign they do not run reads nothing,
 * and a failure comes back as no homebrew rather than as no search.
 */
async function campaignSpells(supabase, campaignId, query) {
  const { data, error } = await listCampaignSpells(supabase, campaignId);

  if (error) {
    logFailure("spellSearch/campaignSpells", error);
    return [];
  }

  return data
    .filter((spell) => spell.name.toLowerCase().includes(query))
    .slice(0, RESULTS)
    .map((spell) => ({
      ...rowSpell(spell),
      isCustom: true,
    }));
}

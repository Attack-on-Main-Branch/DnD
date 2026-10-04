import { listCampaignSpells } from "sina/data/spells";
import {
  CANTRIP_LEVEL,
  DAMAGE_TYPES,
  MAX_SPELL_DESCRIPTION_LENGTH,
  MAX_SPELL_HIGHER_LEVEL_LENGTH,
  MAX_SPELL_LEVEL,
} from "sina/rules/spells";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

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
const API = "https://www.dnd5eapi.co/api/2024";

/** How many cards the grid shows, and so how many details are fetched. */
const RESULTS = 12;

/** Below this a search matches most of the catalogue and none of it usefully. */
const MIN_QUERY = 2;

const INDEX_TTL_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;

/**
 * How long the twelve details get before the answer goes without them. A slow
 * one is dropped from THIS answer; the fetch behind it goes on filling the
 * cache, and a name and a level are enough to find a spell by.
 */
const DETAIL_DEADLINE_MS = 2500;

/**
 * Module scope, which on a serverless host means per instance — so `next:
 * { revalidate }` on every fetch below is the half that survives a cold start
 * and this is the half that answers in microseconds.
 *
 * `loading` holds the in-flight build so a burst of first keystrokes shares one
 * upstream request instead of racing to start their own.
 */
let index = { at: 0, entries: [] };
let loading = null;

const details = new Map();

async function upstream(path) {
  const response = await fetch(`${API}/${path}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { accept: "application/json" },
    // Next's own data cache, which outlives this instance. A week: the list
    // endpoint and the ~320 details behind it are static reference data.
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`);
  }

  return response.json();
}

/**
 * Every spell's name, level and where its detail lives. A failure leaves the
 * previous index in place: a stale catalogue beats no catalogue. The level
 * comes from the index, which is what lets a result be shelved before its
 * detail has arrived.
 */
async function catalogue() {
  if (index.entries.length > 0 && Date.now() - index.at < INDEX_TTL_MS) {
    return index.entries;
  }

  if (!loading) {
    loading = upstream("spells")
      .then((list) => {
        const entries = (list?.results ?? []).map((spell) => ({
          slug: spell.index,
          name: spell.name,
          lower: String(spell.name ?? "").toLowerCase(),
          level: Number.isInteger(spell.level) ? spell.level : null,
          path: `spells/${spell.index}`,
        }));

        index = { at: Date.now(), entries };
        return entries;
      })
      .finally(() => {
        loading = null;
      });
  }

  return loading;
}

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

/** Cached by slug: re-fetching is the latency this route exists to remove. */
async function detail(entry) {
  const held = details.get(entry.slug);

  if (held) {
    return held;
  }

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

  details.set(entry.slug, card);

  return card;
}

/**
 * The detail if it is quick, the outline if not. The timer is cleared either
 * way: an unresolved `setTimeout` holds the Node event loop open.
 */
function detailOrOutline(entry) {
  let timer;

  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(outline(entry)), DETAIL_DEADLINE_MS);
  });

  return Promise.race([
    detail(entry).catch(() => outline(entry)),
    deadline,
  ]).finally(() => clearTimeout(timer));
}

/**
 * Starts-with, then word-starts-with, then merely contains. Ties keep the SRD's
 * own alphabetical order, which is the order the index arrives in.
 */
function rank(entry, query) {
  if (entry.lower.startsWith(query)) {
    return 0;
  }

  return entry.lower.includes(` ${query}`) ? 1 : 2;
}

export async function GET(request) {
  // The upstream is public, so this is not protecting the data — it keeps our
  // server from being an open proxy onto somebody else's rate limit.
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError) {
    logFailure("spellSearch/auth", authError);
    return Response.json({ spells: [] }, { status: 503 });
  }

  if (!user) {
    return Response.json({ spells: [] }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const campaignId = searchParams.get("campaign");

  if (query.length < MIN_QUERY) {
    return Response.json({ spells: [] });
  }

  // Started before the SRD is asked, awaited after.
  const homebrew = campaignId
    ? campaignSpells(supabase, campaignId, query)
    : Promise.resolve([]);

  try {
    const entries = await catalogue();

    const matches = entries
      .filter((entry) => entry.lower.includes(query))
      .sort((a, b) => rank(a, query) - rank(b, query))
      .slice(0, RESULTS);

    // One slow or failed detail must not lose the other eleven.
    const [mine, spells] = await Promise.all([
      homebrew,
      Promise.all(matches.map(detailOrOutline)),
    ]);

    return Response.json(
      // The campaign's own first: likelier wanted than a fifth fire spell.
      { spells: [...mine, ...spells] },
      // Private, not shared: this is behind a session check.
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (thrown) {
    logFailure("spellSearch", {
      reason: "upstream_unavailable",
      detail: String(thrown),
    });

    // The SRD is unreachable; the campaign's own spells are not.
    return Response.json({
      spells: await homebrew,
      reason: "upstream_unavailable",
    });
  }
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
      slug: spell.spell_slug,
      name: spell.name,
      level: spell.level,
      school: spell.school,
      castingTime: spell.casting_time,
      range: spell.range_text,
      components: spell.components,
      material: spell.material,
      duration: spell.duration,
      concentration: spell.concentration,
      ritual: spell.ritual,
      attackSave: spell.attack_save,
      damage: spell.damage,
      description: spell.description,
      higherLevel: spell.higher_level,
      classes: spell.classes,
      damageByLevel: {},
      healByLevel: {},
      isCustom: true,
    }));
}

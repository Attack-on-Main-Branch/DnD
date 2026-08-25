import { listCampaignSpells } from "sina/data/spells";
import { MAX_SPELL_DESCRIPTION_LENGTH } from "sina/rules/spells";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * The SRD's spells and the campaign's own, searchable from the spellbook.
 *
 * The item search next door, for the same reasons: a route rather than a Server
 * Action because it is a READ on every keystroke, and proxied so thirty players
 * searching are not thirty browsers on somebody else's free API.
 * `/api/2014/...` because the bare path is a 301 to it.
 *
 * `campaign_spells` is not cached at all — at most sixty rows, one indexed read
 * away, and unlike the SRD they change.
 */
const API = "https://www.dnd5eapi.co/api/2014";

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
function clip(text) {
  if (text.length <= MAX_SPELL_DESCRIPTION_LENGTH) {
    return text;
  }

  const cut = text.slice(0, MAX_SPELL_DESCRIPTION_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");

  return `${
    lastSpace > MAX_SPELL_DESCRIPTION_LENGTH * 0.75
      ? cut.slice(0, lastSpace)
      : cut
  }…`;
}

/** The SRD writes a rule as an array of paragraphs. It is read as one. */
function paragraphs(lines) {
  return (lines ?? [])
    .map((line) =>
      String(line)
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

/**
 * "8d6 Fire" — the row at the spell's OWN level, which the SRD tabulates per
 * slot level for a levelled spell and per character level for a cantrip.
 */
function damageLine(spell) {
  const damage = spell?.damage;

  if (!damage) {
    return "";
  }

  const bySlot = damage.damage_at_slot_level ?? {};
  const byCharacter = damage.damage_at_character_level ?? {};

  const dice =
    bySlot[String(spell.level)] ??
    byCharacter["1"] ??
    Object.values(bySlot)[0] ??
    Object.values(byCharacter)[0];

  if (!dice) {
    return "";
  }

  return `${dice} ${damage.damage_type?.name ?? ""}`.trim();
}

/** "DEX save" or "Ranged spell attack". The SRD gives at most one. */
function attackSaveLine(spell) {
  const ability = spell?.dc?.dc_type;

  if (ability) {
    const abbr = String(ability.index ?? ability.name ?? "")
      .slice(0, 3)
      .toUpperCase();

    return abbr ? `${abbr} save` : "Saving throw";
  }

  if (spell?.attack_type) {
    const kind = String(spell.attack_type);

    return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} spell attack`;
  }

  return "";
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

  const card = {
    slug: entry.slug,
    name: spell?.name ?? entry.name,
    level: Number.isInteger(spell?.level) ? spell.level : entry.level,
    school: spell?.school?.name ?? "",
    castingTime: spell?.casting_time ?? "",
    range: spell?.range ?? "",
    components: (spell?.components ?? []).join(", "),
    material: spell?.material ?? "",
    duration: spell?.duration ?? "",
    concentration: Boolean(spell?.concentration),
    ritual: Boolean(spell?.ritual),
    attackSave: attackSaveLine(spell),
    damage: damageLine(spell),
    description: clip(paragraphs(spell?.desc)),
    higherLevel: paragraphs(spell?.higher_level),
    classes: (spell?.classes ?? [])
      .map((one) => one?.name)
      .filter(Boolean)
      .join(", "),
    // The scaling tables verbatim, so an upcast rolls what the SRD tabulates.
    // A cantrip's are keyed on character level and a levelled spell's on slot
    // level; `spellDiceAt` is what knows which.
    damageByLevel:
      spell?.damage?.damage_at_slot_level ??
      spell?.damage?.damage_at_character_level ??
      {},
    healByLevel: spell?.heal_at_slot_level ?? {},
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

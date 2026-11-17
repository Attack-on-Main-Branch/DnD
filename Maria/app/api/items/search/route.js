import { listCampaignItems } from "sina/data/inventory";
import { MAX_ITEM_DESCRIPTION_LENGTH } from "sina/rules/inventory";

import { catalogueItem } from "@/app/dashboard/inventory-presentation";
import { memoizeAsync } from "@/lib/async-cache.mjs";
import { logFailure } from "@/lib/errors";

import {
  cacheCatalogue,
  RESULTS,
  searchCatalogue,
  upstream,
} from "../../catalogue-search";

/**
 * The SRD's items, and the campaign's own, searchable from the pack.
 *
 * A route rather than a Server Action because it is a READ on every keystroke,
 * where an Action is a POST serialised against the router's queue.
 *
 * Proxied rather than called from the browser for three reasons: a
 * search-as-you-type from thirty players is thirty browsers on somebody else's
 * free API, the answers arrive unchecked into a form that writes to our
 * columns, and the site would need a `connect-src` for a third-party host.
 *
 * `/api/2024/...` for the 2024 rules; the bare path is a 301 to the 2014 ones.
 *
 * The campaign's own items are not cached at all — there are at most sixty, one
 * indexed read away, and unlike the SRD they change.
 */
/** Each carries the category to file a result under when the detail has none. */
const SOURCES = [
  { path: "equipment", fallback: "Equipment" },
  { path: "magic-items", fallback: "Magic Item" },
];

/**
 * The ten weapon properties and what each one MEANS, by name.
 *
 * Most equipment carries no description at all — the rulebook writes nothing
 * about a longsword beyond its numbers — so the only prose 5e attaches to a
 * weapon is the rule behind Versatile, Thrown, Ammunition and the rest. That is
 * what an item's panel prints where a spell prints its own text, and it is the
 * answer a player actually wants when they see the tag.
 *
 * Ten entries, fetched once and kept: the same per-instance memory the
 * catalogue lives in.
 */
let rules = null;

async function propertyRules() {
  if (!rules) {
    rules = upstream("weapon-properties")
      .then(async (list) => {
        const named = await Promise.all(
          (list?.results ?? []).map(async (one) => {
            const rule = await upstream(`weapon-properties/${one.index}`);

            return [one.name, paragraphsOf(rule?.description).join(" ")];
          }),
        );

        return new Map(named.filter(([, desc]) => desc));
      })
      // A failed fetch must not be remembered as an empty map for the life of
      // the instance: the next caller tries again.
      .catch(() => {
        rules = null;
        return new Map();
      });
  }

  return rules;
}

// Equipment and magic items share one ranked list.
const catalogue = cacheCatalogue(async () => {
  const lists = await Promise.all(
    SOURCES.map(async ({ path, fallback }) => {
      const list = await upstream(path);
      return (list?.results ?? []).map((item) => ({
        slug: item.index,
        name: item.name,
        lower: String(item.name ?? "").toLowerCase(),
        path: `${path}/${item.index}`,
        fallback,
      }));
    }),
  );

  return lists.flat();
});

/**
 * The prose, and only the prose. What the SRD says in figures — the dice, the
 * price, the weight — used to be composed onto the end of this, because a card
 * had one line for all of it. It has its own field now (`factsOf`), and a
 * description that repeated it would print every weapon's stats twice.
 *
 * Empty for the many entries that carry no prose at all, which is honest: a
 * longsword has nothing written about it beyond its numbers.
 */
function describe(item) {
  const prose = proseOf(item).join("\n\n");

  return prose ? clip(prose) : "";
}

/** A string in one 2024 endpoint, an array of paragraphs in the next. */
function paragraphsOf(value) {
  return (Array.isArray(value) ? value : [value])
    .map((line) =>
      String(line ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** Equipment writes `description`, magic items still write `desc`. */
function proseOf(item) {
  const written = paragraphsOf(item?.description);

  return written.length > 0 ? written : paragraphsOf(item?.desc);
}

/** Broadest first: a longsword is filed under all four of its weapon groups. */
const SHELVES = ["weapons", "armor", "tools", "ammunition", "adventuring-gear"];

/** The groupings between "Weapons" and "Martial Melee Weapons" that add nothing to either. */
const WEAPON_GROUPINGS = /^(?:simple|martial|melee|ranged)-weapons$/;

function categoriesOf(item) {
  return (
    item?.equipment_categories ??
    (item?.equipment_category ? [item.equipment_category] : [])
  );
}

function shelfOf(categories) {
  return (
    SHELVES.map((index) => categories.find((one) => one.index === index)).find(
      Boolean,
    ) ?? categories[0]
  );
}

/** "Martial Melee", "Heavy", "Artisan's Tools" — the shelf's own word dropped. */
function kindOf(categories, shelf) {
  const narrower = categories.filter(
    (one) => one !== shelf && !WEAPON_GROUPINGS.test(one.index),
  );

  const kind =
    narrower.find((one) => one.index.endsWith(shelf?.index)) ?? narrower[0];

  return kind?.name?.replace(/\s+(?:Weapons|Armor)$/, "") ?? "";
}

/**
 * What the rulebook says about a thing besides its name: the dice, the armour,
 * the price, the weight. Composed here because the shapes are the SRD's own —
 * `damage.damage_dice` with a type beside it, an `armor_class` of three parts,
 * a range that means reach on a melee weapon and distance on a bow.
 *
 * Only what is there. A rope has a price and a weight and nothing else, and a
 * panel that printed "Damage —" for it would be answering a question nobody
 * asked.
 */
function factsOf(item) {
  const facts = {};

  const categories = categoriesOf(item);
  const kind = kindOf(categories, shelfOf(categories));

  if (kind) {
    facts.kind = kind;
  }

  if (item?.rarity?.name) {
    facts.rarity = item.rarity.name;
  }

  if (item?.damage?.damage_dice) {
    facts.damage =
      `${item.damage.damage_dice} ${item.damage.damage_type?.name ?? ""}`.trim();
  }

  if (item?.two_handed_damage?.damage_dice) {
    facts.versatile =
      `${item.two_handed_damage.damage_dice} ${item.two_handed_damage.damage_type?.name ?? ""}`.trim();
  }

  if (item?.armor_class?.base) {
    const dex = item.armor_class.dex_bonus
      ? ` + DEX${item.armor_class.max_bonus ? ` (max ${item.armor_class.max_bonus})` : ""}`
      : "";

    facts.armorClass = `${item.armor_class.base}${dex}`;
  }

  /* A melee weapon's `range.normal` is its reach, which is 5 for almost all of
     them and worth nothing on a card. A distance is only a distance when the
     weapon is ranged or the range has a long end. */
  const ranged = categories.some((one) => one.index === "ranged-weapons");

  if (item?.range?.normal && (ranged || item.range.long)) {
    facts.range = span(item.range);
  }

  if (item?.throw_range?.normal) {
    facts.thrown = span(item.throw_range);
  }

  const properties = (item?.properties ?? [])
    .map((one) => one?.name)
    .filter(Boolean);

  if (properties.length > 0) {
    facts.properties = properties.join(", ");
  }

  if (item?.str_minimum) {
    facts.strength = `Str ${item.str_minimum}`;
  }

  if (item?.stealth_disadvantage) {
    facts.stealth = "Disadvantage";
  }

  if (item?.cost) {
    facts.cost = `${item.cost.quantity} ${item.cost.unit}`;
  }

  if (item?.weight) {
    facts.weight = `${item.weight} lb`;
  }

  // A field of its own in 2024; the 2014 rules only wrote it into the prose.
  if (
    item?.attunement === true ||
    /requires attunement/i.test(proseOf(item).join(" "))
  ) {
    facts.attunement = true;
  }

  return facts;
}

function span(range) {
  return range.long ? `${range.normal}/${range.long} ft` : `${range.normal} ft`;
}

/**
 * The column's bound, taken at the last word: a hard slice leaves an SRD entry
 * ending "you lop off a po", which reads as a bug rather than a limit. The
 * floor stops a text with no spaces in its last quarter from vanishing.
 */
function clip(text) {
  if (text.length <= MAX_ITEM_DESCRIPTION_LENGTH) {
    return text;
  }

  const cut = text.slice(0, MAX_ITEM_DESCRIPTION_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(" ");

  return `${
    lastSpace > MAX_ITEM_DESCRIPTION_LENGTH * 0.75
      ? cut.slice(0, lastSpace)
      : cut
  }…`;
}

/**
 * What the rulebook says about a weapon that has nothing written about it: the
 * rule behind each property it carries, named and then quoted.
 *
 * Empty for armour and gear, which have neither prose nor properties — an
 * honest nothing rather than a sentence this app made up.
 */
function propertyText(item, known) {
  const written = (item?.properties ?? [])
    .map((one) => one?.name)
    .filter((name) => known.has(name))
    .map((name) => `${name}. ${known.get(name)}`);

  return written.length > 0 ? clip(written.join("\n\n")) : "";
}

/** What the index alone already knows: enough to show and enough to hand out. */
function outline(entry) {
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.fallback,
    description: "",
    facts: {},
  };
}

const detail = memoizeAsync(
  async function detail(entry) {
    const [item, known] = await Promise.all([
      upstream(entry.path),
      propertyRules(),
    ]);

    const card = {
      slug: entry.slug,
      name: item?.name ?? entry.name,
      category:
        shelfOf(categoriesOf(item))?.name ??
        item?.rarity?.name ??
        entry.fallback,
      description: describe(item) || propertyText(item, known),
      facts: factsOf(item),
    };

    return card;
  },
  (entry) => entry.slug,
);

export async function GET(request) {
  return searchCatalogue(request, {
    kind: "item",
    catalogue,
    campaignEntries: campaignItems,
    detail,
    outline,
  });
}

/**
 * `isCustom` routes these down a different path when handed out: `readMove` in
 * pack-actions.js re-derives a custom item's slug from its name, where an SRD
 * one keeps the slug the index gave it.
 *
 * RLS is the scope — a caller naming a campaign they do not run reads nothing,
 * and a failure comes back as no homebrew rather than as no search.
 */
async function campaignItems(supabase, campaignId, query) {
  const { data, error } = await listCampaignItems(supabase, campaignId);

  if (error) {
    logFailure("itemSearch/campaignItems", error);
    return [];
  }

  return data
    .filter((item) => item.name.toLowerCase().includes(query))
    .slice(0, RESULTS)
    .map(catalogueItem);
}

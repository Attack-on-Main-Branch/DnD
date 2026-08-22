import { listCampaignItems } from "sina/data/inventory";
import { MAX_ITEM_DESCRIPTION_LENGTH } from "sina/rules/inventory";

import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

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
 * `/api/2014/...` and not `/api/...`: the bare path is a 301 to it.
 *
 * The campaign's own items are not cached at all — there are at most sixty, one
 * indexed read away, and unlike the SRD they change.
 */
const API = "https://www.dnd5eapi.co/api/2014";

/** Each carries the category to file a result under when the detail has none. */
const SOURCES = [
  { path: "equipment", fallback: "Equipment" },
  { path: "magic-items", fallback: "Magic Item" },
];

/** How many cards the grid shows, and so how many details are fetched. */
const RESULTS = 12;

/** Below this a search matches most of the catalogue and none of it usefully. */
const MIN_QUERY = 2;

const INDEX_TTL_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;

/**
 * How long the twelve details get before the answer goes without them. Measured
 * cold against the live API at about fifteen seconds, warm at three
 * milliseconds. A card is useful without its description, so a slow detail is
 * dropped from THIS answer; the fetch behind it goes on filling the cache.
 */
const DETAIL_DEADLINE_MS = 2500;

/**
 * Module scope, which on a serverless host means per instance — so `next:
 * { revalidate }` on every fetch below is the half that survives a cold start
 * and this is the half that answers in microseconds.
 *
 * `loading` holds the in-flight build so a burst of first keystrokes shares one
 * pair of upstream requests instead of racing to start their own.
 */
let index = { at: 0, entries: [] };
let loading = null;

const details = new Map();

async function upstream(path) {
  const response = await fetch(`${API}/${path}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { accept: "application/json" },
    // Next's own data cache, which outlives this instance. A week: the two list
    // endpoints and the ~400 details behind them are static reference data.
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`);
  }

  return response.json();
}

/**
 * Every item's name and where its detail lives. A failure leaves the previous
 * index in place: a stale catalogue beats no catalogue.
 */
async function catalogue() {
  if (index.entries.length > 0 && Date.now() - index.at < INDEX_TTL_MS) {
    return index.entries;
  }

  if (!loading) {
    loading = Promise.all(
      SOURCES.map(async (source) => {
        const list = await upstream(source.path);

        return (list?.results ?? []).map((item) => ({
          slug: item.index,
          name: item.name,
          lower: String(item.name ?? "").toLowerCase(),
          path: `${source.path}/${item.index}`,
          fallback: source.fallback,
        }));
      }),
    )
      .then((lists) => {
        index = { at: Date.now(), entries: lists.flat() };
        return index.entries;
      })
      .finally(() => {
        loading = null;
      });
  }

  return loading;
}

/**
 * Ordinary equipment usually has no `desc` at all, so the cost, weight and
 * damage the API does carry are made into one.
 */
function describe(item) {
  const prose = (item?.desc ?? []).join(" ").replace(/\s+/g, " ").trim();

  if (prose) {
    return clip(prose);
  }

  const facts = [
    item?.damage?.damage_dice &&
      `${item.damage.damage_dice} ${item.damage.damage_type?.name ?? ""}`.trim(),
    item?.armor_class?.base && `AC ${item.armor_class.base}`,
    item?.cost && `${item.cost.quantity} ${item.cost.unit}`,
    item?.weight && `${item.weight} lb`,
  ].filter(Boolean);

  return facts.join(" · ");
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

/** What the index alone already knows: enough to show and enough to hand out. */
function outline(entry) {
  return {
    slug: entry.slug,
    name: entry.name,
    category: entry.fallback,
    description: "",
  };
}

/** Cached by slug: re-fetching is the latency this route exists to remove. */
async function detail(entry) {
  const held = details.get(entry.slug);

  if (held) {
    return held;
  }

  const item = await upstream(entry.path);

  const card = {
    slug: entry.slug,
    name: item?.name ?? entry.name,
    category:
      item?.equipment_category?.name ?? item?.rarity?.name ?? entry.fallback,
    description: describe(item),
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
    logFailure("itemSearch/auth", authError);
    return Response.json({ items: [] }, { status: 503 });
  }

  if (!user) {
    return Response.json({ items: [] }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const campaignId = searchParams.get("campaign");

  if (query.length < MIN_QUERY) {
    return Response.json({ items: [] });
  }

  // Started before the SRD is asked, awaited after.
  const homebrew = campaignId
    ? campaignItems(supabase, campaignId, query)
    : Promise.resolve([]);

  try {
    const entries = await catalogue();

    const matches = entries
      .filter((entry) => entry.lower.includes(query))
      .sort((a, b) => rank(a, query) - rank(b, query))
      .slice(0, RESULTS);

    // One slow or failed detail must not lose the other eleven.
    const [mine, items] = await Promise.all([
      homebrew,
      Promise.all(matches.map(detailOrOutline)),
    ]);

    return Response.json(
      // The campaign's own first: likelier wanted than a fifth longsword variant.
      { items: [...mine, ...items] },
      // Private, not shared: this is behind a session check.
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (thrown) {
    logFailure("itemSearch", {
      reason: "upstream_unavailable",
      detail: String(thrown),
    });

    // The SRD is unreachable; the campaign's own items are not.
    return Response.json({
      items: await homebrew,
      reason: "upstream_unavailable",
    });
  }
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
    .map((item) => ({
      slug: item.item_slug,
      name: item.name,
      category: item.category,
      description: item.description,
      isCustom: true,
    }));
}

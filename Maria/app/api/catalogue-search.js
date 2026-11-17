import { MIN_QUERY, UPSTREAM_UNAVAILABLE } from "@/lib/catalogue-search";
import { logFailure } from "@/lib/errors";
import { createClient, getCurrentUser } from "@/lib/supabase";

const API = "https://www.dnd5eapi.co/api/2024";
const INDEX_TTL_MS = 6 * 60 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;
const DETAIL_DEADLINE_MS = 2500;
export const RESULTS = 12;

export async function upstream(path) {
  const response = await fetch(`${API}/${path}`, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { accept: "application/json" },
    next: { revalidate: 604800 },
  });

  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`);
  }

  return response.json();
}

export function cacheCatalogue(load) {
  let entries = [];
  let loadedAt = 0;
  let loading = null;

  return async function catalogue() {
    if (entries.length > 0 && Date.now() - loadedAt < INDEX_TTL_MS) {
      return entries;
    }

    loading ??= load()
      .then((index) => {
        loadedAt = Date.now();
        entries = index;
        return entries;
      })
      .finally(() => {
        loading = null;
      });

    return loading;
  };
}

function detailOrOutline(entry, detail, outline) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(outline(entry)), DETAIL_DEADLINE_MS);
  });

  return Promise.race([
    detail(entry).catch(() => outline(entry)),
    deadline,
  ]).finally(() => clearTimeout(timer));
}

function rank(entry, query) {
  if (entry.lower.startsWith(query)) {
    return 0;
  }

  return entry.lower.includes(` ${query}`) ? 1 : 2;
}

export async function searchCatalogue(
  request,
  { kind, catalogue, campaignEntries, detail, outline },
) {
  const key = `${kind}s`;
  const action = `${kind}Search`;
  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (authError) {
    logFailure(`${action}/auth`, authError);
    return Response.json({ [key]: [] }, { status: 503 });
  }

  if (!user) {
    return Response.json({ [key]: [] }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const campaignId = searchParams.get("campaign");

  if (query.length < MIN_QUERY) {
    return Response.json({ [key]: [] });
  }

  const homebrew = campaignId
    ? campaignEntries(supabase, campaignId, query)
    : Promise.resolve([]);

  try {
    const entries = await catalogue();
    const matches = entries
      .filter((entry) => entry.lower.includes(query))
      .sort((a, b) => rank(a, query) - rank(b, query))
      .slice(0, RESULTS);

    const [mine, results] = await Promise.all([
      homebrew,
      Promise.all(
        matches.map((entry) => detailOrOutline(entry, detail, outline)),
      ),
    ]);

    return Response.json(
      { [key]: [...mine, ...results] },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch (thrown) {
    logFailure(action, {
      reason: UPSTREAM_UNAVAILABLE,
      detail: String(thrown),
    });

    return Response.json({
      [key]: await homebrew,
      reason: UPSTREAM_UNAVAILABLE,
    });
  }
}

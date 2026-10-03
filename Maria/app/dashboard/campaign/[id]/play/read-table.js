import { asksAnything, mergeWants, tableSliceQuery } from "@/lib/table-slices";

/**
 * The table's slices off api/campaigns/[id]/table — see the head of that route
 * for why it is a route. Null when nothing could be read.
 */
async function readTableSlice(campaignId, want) {
  try {
    const response = await fetch(
      `/api/campaigns/${encodeURIComponent(campaignId)}/table?${tableSliceQuery(want)}`,
      { cache: "no-store", headers: { accept: "application/json" } },
    );

    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

/** Long enough to catch one event's doorbell and its wire message together. */
const GATHER_MS = 40;

/**
 * Every re-read the table asks for, as few requests as will answer them.
 *
 * One change rings more than once — a log line is a Postgres doorbell AND a
 * wire message, and coming back to the tab rings every subscriber at once — so
 * the asks in one short window go as a single read with every slice any of them
 * wanted, and anything asked while that read is out goes as one more the moment
 * it lands. Never two in flight: an older answer landing after a newer one is
 * exactly the stale board this is here to stop.
 *
 * `land` gets the slices and when they were asked for, which is what lets the
 * store tell an answer that predates a change from one that has seen it. Each
 * promise resolves to whether its answer arrived at all.
 */
export function gatherReads(campaignId, land) {
  let wanted = null;
  let waiting = [];
  let timer = null;
  let flying = false;

  function go() {
    timer = null;

    if (flying || !wanted) {
      return;
    }

    const want = wanted;
    const settle = waiting;

    wanted = null;
    waiting = [];

    if (!asksAnything(want)) {
      for (const done of settle) {
        done(false);
      }

      return;
    }

    flying = true;

    const askedAt = Date.now();

    readTableSlice(campaignId, want)
      .then((slices) => {
        if (!slices) {
          return false;
        }

        land(slices, askedAt);
        return true;
      })
      .catch(() => false)
      .then((landed) => {
        flying = false;

        for (const done of settle) {
          done(landed);
        }

        go();
      });
  }

  return (want) =>
    new Promise((resolve) => {
      wanted = mergeWants(wanted, want);
      waiting.push(resolve);

      if (!timer && !flying) {
        timer = setTimeout(go, GATHER_MS);
      }
    });
}

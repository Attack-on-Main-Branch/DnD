"use server";

import {
  listCampaignActivity,
  recordCampaignActivity,
} from "sina/data/activity";
import {
  moveCampaignCurrency,
  spendCurrency,
  transferCurrency,
} from "sina/data/currency";
import { MAX_ACTIVITY_ENTRIES, readActivityLog } from "sina/rules/activity";
import {
  COIN_TYPES,
  emptyPurse,
  isCoin,
  MAX_COINS,
  parseCoins,
  parsePurse,
} from "sina/rules/currency";

import { logFailure, logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Everything the purse writes. Its own file rather than more of pack-actions.js
 * next door: that one is the pack's, and a coin is not an item — it stacks in a
 * column rather than a row, and these call different functions entirely.
 *
 * The validation here is the run that counts. The drawers run the same
 * `sina/rules/currency` functions in the browser for speed, and nothing that
 * arrives at these functions is believed.
 *
 * Each of the three answers with WHAT MOVED rather than what was asked for. The
 * amounts are clamped in the database — at the ceiling going up, at zero coming
 * down — and the table's log is written from the difference, so a Dungeon
 * Master emptying a purse by typing 9999 into it gets "took 3 Gold" and not a
 * sentence about 9999.
 *
 * THE LOG IS WRITTEN HERE, not by a trigger: a purse is five columns on
 * `characters` and a grant to the party is five columns across six rows, so
 * there is no single row change one sentence could be read back from. Writing it
 * on this side of the wire is what takes the second round trip out of it — the
 * amounts the entry needs are the ones the database just handed back.
 *
 * Nothing is revalidated; the purse and the log are held in table-state.jsx.
 */

async function signedIn(action) {
  const supabase = await createClient();
  const { user, error } = await getCurrentUser(supabase);

  return user ? { supabase } : { rejection: sessionRejection(action, error) };
}

/**
 * Sina reports why; the wording lives here, where the user can see it.
 *
 * Everything but `not_found` is the same sentence whichever deed asked, so the
 * maps below are this one plus the line that differs. `not_found` is where they
 * part: the database deliberately answers "not yours to touch" and "no such
 * character" identically, so each caller says the thing its own user is
 * overwhelmingly likely to have done.
 */
const COIN_COPY = {
  invalid_value: "That is outside what a purse can hold.",
  missing_function: "That part of the app is not ready yet.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
};

const MOVE_COPY = {
  ...COIN_COPY,
  not_found: "That purse is not yours to move.",
};

const SPEND_COPY = {
  ...COIN_COPY,
  not_found: "That purse is no longer yours.",
};

const HAND_COPY = {
  ...COIN_COPY,
  not_found: "There is not that much to hand over.",
};

function refused(action, copy, error, fallback) {
  const said = copy[error.reason];

  logUncovered(action, error, said);
  return rejected(said ?? fallback);
}

async function freshLog(supabase, campaignId) {
  const { data, error } = await listCampaignActivity(
    supabase,
    campaignId,
    MAX_ACTIVITY_ENTRIES,
  );

  if (error) {
    logFailure("listCampaignActivity", error);
    return undefined;
  }

  return readActivityLog(data);
}

/**
 * One entry, and never a failed deed: a log that has quietly stopped recording
 * looks exactly like a table where nothing has happened, so a refusal goes to
 * the console and the coins stay moved.
 */
async function note(supabase, action, values) {
  const { error } = await recordCampaignActivity(supabase, {
    ...values,
    action,
  });

  if (error) {
    logFailure(`${action}/record`, error);
  }
}

/**
 * What to write in the log, out of one row per purse the database touched.
 *
 * For ONE purse that is simply what moved. For the whole party the amounts can
 * differ — a take is clamped at zero per character, so the poorest member gives
 * up less than the others — and one sentence cannot carry five figures. The
 * LARGEST is the one it carries: it is never more than somebody actually lost,
 * and when nobody was short it is the amount every one of them moved, which is
 * the ordinary case.
 *
 * Not the request, which is the other obvious answer and the wrong one: "took
 * 9999 Gold from the party" off purses holding three each is a sentence about
 * something that did not happen.
 */
function movedCoins(rows) {
  const coins = emptyPurse();

  for (const row of rows) {
    for (const coin of COIN_TYPES) {
      coins[coin] = Math.max(coins[coin], parseCoins(row?.[coin]) ?? 0);
    }
  }

  return coins;
}

/**
 * The Dungeon Master's Grant and Take, which are one deed in two directions:
 * five amounts, into one purse or into every purse at this table.
 *
 * `characterId` null is the whole party, and either way it is one transaction.
 * Who may do it is `move_campaign_currency`'s to decide — it answers the head of
 * this table and nobody else, and re-checks the membership itself, so a
 * character id arriving from a row of pills is not a permission.
 *
 * One entry per denomination that actually moved — five at once would fill half
 * a log that keeps ten — and one after another rather than together, because the
 * purge trigger keeps the newest ten and two entries written in one instant tie
 * on `now()`.
 */
export async function moveTableCoins(campaignId, characterId, input, take) {
  const { coins, total } = parsePurse(input);

  if (total === 0) {
    return rejected(
      take
        ? "Set an amount to take first."
        : "Set an amount to hand out first.",
    );
  }

  const { supabase, rejection } = await signedIn("moveTableCoins");

  if (rejection) {
    return rejection;
  }

  const { data, error } = await moveCampaignCurrency(supabase, {
    campaignId,
    characterId: characterId ?? null,
    coins,
    take: Boolean(take),
  });

  if (error) {
    return refused("moveTableCoins", MOVE_COPY, error, "Could not move that.");
  }

  const moved = data.moved;

  /* No rows is nothing moved. The drawer only ever calls this with names on
     screen, so an empty answer is a refusal rather than an empty party. */
  if (moved.length === 0) {
    return rejected(MOVE_COPY.not_found);
  }

  const found = movedCoins(moved);

  for (const coin of COIN_TYPES.filter((one) => found[one] > 0)) {
    await note(supabase, take ? "coin_revoked" : "coin_granted", {
      campaignId,
      // Coins move from the head of the table's chair alone, and
      // `record_campaign_activity` refuses anybody else outright.
      actorCharacterId: null,
      targetCharacterId: characterId ?? null,
      coin,
      coinAmount: found[coin],
    });
  }

  return {
    kind: "success",
    purses: moved.length,
    coins: found,
    // What each purse actually moved by, which is not always what was asked for:
    // a take is clamped at zero per character.
    moved,
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * Coins spent. Who may empty which purse is `spend_currency`'s to decide — it
 * answers for the character's owner and for the Dungeon Master of a table they
 * sit at, and refuses everybody else with the same null a deleted character
 * gives.
 *
 * `taken` is what actually left, which is the whole amount unless the page was
 * stale — and it is what the log is written from.
 */
export async function spendCharacterCoins(
  campaignId,
  characterId,
  coin,
  amount,
) {
  const { count, rejection: bad } = readMove(coin, amount);

  if (bad) {
    return bad;
  }

  const { supabase, rejection } = await signedIn("spendCharacterCoins");

  if (rejection) {
    return rejection;
  }

  const { data, error } = await spendCurrency(supabase, {
    characterId,
    coin,
    amount: count,
  });

  if (error) {
    return refused(
      "spendCharacterCoins",
      SPEND_COPY,
      error,
      "Could not spend that.",
    );
  }

  if (data.taken === 0) {
    return rejected("There is none of that left to spend.");
  }

  // Filed under the purse's own chair and naming nobody: "Frieren spent 12 GP"
  // is one event.
  await note(supabase, "coin_spent", {
    campaignId,
    actorCharacterId: characterId,
    coin,
    coinAmount: data.taken,
  });

  return {
    kind: "success",
    taken: data.taken,
    activity: await freshLog(supabase, campaignId),
  };
}

/**
 * One purse to another, in one transaction. Which of them the caller may empty
 * is `transfer_currency`'s to decide — it re-checks that both characters are at
 * the same table and that this one is the caller's to give from, so the
 * receiver's id arriving from a list of names is not a permission.
 *
 * The one move here that is refused rather than clamped when the purse is
 * short: half a hand-over is the one outcome a table cannot reconcile.
 */
export async function handCharacterCoins(
  campaignId,
  fromCharacterId,
  toCharacterId,
  coin,
  amount,
) {
  const { count, rejection: bad } = readMove(coin, amount);

  if (bad) {
    return bad;
  }

  if (!toCharacterId || toCharacterId === fromCharacterId) {
    return rejected("Choose who is being handed it.");
  }

  const { supabase, rejection } = await signedIn("handCharacterCoins");

  if (rejection) {
    return rejection;
  }

  const { error } = await transferCurrency(supabase, {
    fromCharacterId,
    toCharacterId,
    coin,
    amount: count,
  });

  if (error) {
    return refused(
      "handCharacterCoins",
      HAND_COPY,
      error,
      "Could not hand that over.",
    );
  }

  await note(supabase, "coin_transferred", {
    campaignId,
    actorCharacterId: fromCharacterId,
    targetCharacterId: toCharacterId,
    coin,
    coinAmount: count,
  });

  return {
    kind: "success",
    taken: count,
    activity: await freshLog(supabase, campaignId),
  };
}

/** A denomination and an amount, both put back through the rules. */
function readMove(coin, amount) {
  if (!isCoin(coin)) {
    return { rejection: rejected("That is not a coin.") };
  }

  const count = parseCoins(amount);

  if (count === null || count < 1) {
    return { rejection: rejected(`An amount is 1 to ${MAX_COINS}.`) };
  }

  return { count };
}

"use server";

import { revalidatePath } from "next/cache";
import {
  consumeSpellSlot,
  forgetSpell,
  learnSpell,
  restoreSpellSlot,
} from "sina/data/spells";
import { SLOT_LEVELS } from "sina/rules/spellcasting";
import {
  MAX_CHARACTER_SPELLS,
  readCatalogueSpell,
  spellSlug,
  validateSpell,
} from "sina/rules/spells";

import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { campaignTablePath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

/**
 * Everything the spellbook writes. The validation here is the run that counts:
 * the drawers run the same `sina/rules/spells` functions for speed, and nothing
 * arriving here is believed — least of all the slug, which is the key a shelf is
 * unique on and is re-derived on every call.
 */

/** Sina reports why; the wording lives here, where the user can see it. */
const SPELL_COPY = {
  not_found: "That spell is no longer theirs to know.",
  already_known: "That spell is already in the book.",
  limit_reached: `A spellbook holds ${MAX_CHARACTER_SPELLS} spells.`,
  invalid_value: "That is outside what a spellbook can hold.",
  missing_table: "That part of the app is not ready yet.",
  bad_id: "That character is no longer at this table.",
  no_slots: "No slot of that level is left.",
};

async function signedIn(action) {
  const supabase = await createClient();
  const { user, error } = await getCurrentUser(supabase);

  return user ? { supabase } : { rejection: sessionRejection(action, error) };
}

function refused(action, error, fallback) {
  const copy = SPELL_COPY[error.reason];

  logUncovered(action, error, copy);
  return rejected(copy ?? fallback);
}

/**
 * Which rule the spell goes through is what `isCustom` decides: one the campaign
 * invented is bound by `validateSpell`, which derives `custom:frost-lash` from
 * the NAME, where an SRD one keeps the slug the index gave it. The same fork
 * `readMove` makes in pack-actions.js.
 */
function readTaught(spell) {
  return spell?.isCustom
    ? validateSpell(spell ?? {}).values
    : readCatalogueSpell(spell ?? {});
}

/**
 * One spell into one book, or into every book at the table. A teach that fails
 * for one character does not roll back the others.
 *
 * A spell somebody already knows is NOT a failure of the whole deed: teaching
 * the party Light when the cleric has it is five books changed and one left
 * alone. It is only reported when nothing else landed.
 */
export async function teachSpell(campaignId, characterIds, spell) {
  const values = readTaught(spell);

  if (!values) {
    return rejected("That is not a spell this book can hold.");
  }

  const targets = [...new Set((characterIds ?? []).filter(Boolean))];

  if (targets.length === 0) {
    return rejected("Choose who is learning it.");
  }

  const { supabase, rejection } = await signedIn("teachSpell");

  if (rejection) {
    return rejection;
  }

  // Together rather than in sequence: six round trips one after another is a
  // visible pause on a control that has already told the user it worked.
  const results = await Promise.all(
    targets.map((characterId) =>
      learnSpell(supabase, { characterId, spell: values }),
    ),
  );

  revalidatePath(campaignTablePath(campaignId));

  const failures = results.filter((result) => result.error);

  if (failures.length === 0) {
    return { kind: "success" };
  }

  // Anything that is not "they already had it" is the one worth saying.
  const real = failures.find(
    (result) => result.error.reason !== "already_known",
  );

  if (!real && failures.length < results.length) {
    return { kind: "success" };
  }

  return refused(
    "teachSpell",
    (real ?? failures[0]).error,
    "Could not teach that spell.",
  );
}

/** Struck out of the book. There is no half of a spell to leave behind. */
export async function unlearnSpell(campaignId, characterId, slug) {
  const key = spellSlug(slug);

  if (!characterId || !key) {
    return rejected("That is not a spell this book can hold.");
  }

  const { supabase, rejection } = await signedIn("unlearnSpell");

  if (rejection) {
    return rejection;
  }

  const { error } = await forgetSpell(supabase, { characterId, slug: key });

  if (error) {
    return refused("unlearnSpell", error, "Could not forget that spell.");
  }

  revalidatePath(campaignTablePath(campaignId));
  return { kind: "success" };
}

/**
 * One slot spent or given back — a cast, or the head of the table correcting a
 * miscount. A DIRECTION and not a total, for the reason the health band's
 * reducer takes one: a total is computed against a row that may have moved.
 *
 * `consume` can refuse, which is what makes a cast safe to build on: the caller
 * pays before it reaches the dice or the log. `restore` clamps instead, and the
 * database admits the head of the table alone for it.
 */
export async function moveSpellSlot(campaignId, characterId, slotLevel, by) {
  const slot = Number(slotLevel);

  if (!characterId || !SLOT_LEVELS.includes(slot)) {
    return rejected("That is not a spell slot.");
  }

  const { supabase, rejection } = await signedIn("moveSpellSlot");

  if (rejection) {
    return rejection;
  }

  const { error } =
    by > 0
      ? await consumeSpellSlot(supabase, { characterId, slotLevel: slot })
      : await restoreSpellSlot(supabase, { characterId, slotLevel: slot });

  if (error) {
    return refused("moveSpellSlot", error, "Could not move that slot.");
  }

  revalidatePath(campaignTablePath(campaignId));
  return { kind: "success" };
}

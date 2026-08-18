"use client";

import { useState, useTransition } from "react";
import { MAX_PARTY, parseCharacterQuery } from "sina/rules/campaign";

import Avatar from "@/app/components/ui/avatar";
import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

import {
  addCharacterToParty,
  findPartyCandidate,
  removeCharacterFromParty,
} from "../../actions";

const FEEDBACK_ID = "party-feedback";

function readQuery(formData) {
  return { query: String(formData.get("query") ?? "") };
}

function validateQuery({ query }) {
  return parseCharacterQuery(query)
    ? null
    : {
        field: "query",
        message: "Search by name or id.",
        // The only path that never reaches the action, so the echoed query has
        // to come from here instead.
        query,
      };
}

/**
 * The party: who is in it, and how to add somebody. The search takes a fragment
 * rather than a whole handle, since a DM usually has a name someone said out
 * loud. It returns a list to pick from — two characters can differ only in
 * their four digits and belong to different people.
 *
 * The echoed query reaches the box through `key` and `defaultValue`, which is
 * what makes an uncontrolled input adopt it after each search.
 */
export default function PartyPanel({ campaignId, members }) {
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const {
    state,
    formAction,
    isPending: isSearching,
  } = useFormAction({
    action: findPartyCandidate,
    read: readQuery,
    validate: validateQuery,
  });

  const results = state?.kind === "success" ? state.results : null;
  const full = members.length >= MAX_PARTY;
  const inParty = new Set(members.map((member) => member.id));

  function run(work) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
      }
    });
  }

  const busy = isPending || isSearching;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Add a character
        </h3>

        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/50 uppercase">
          {members.length} of {MAX_PARTY}
        </p>
      </div>

      <form action={formAction} noValidate className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1">
          <TextField
            key={state?.query ?? ""}
            label="Search"
            name="query"
            type="text"
            autoComplete="off"
            placeholder="Name or id"
            defaultValue={state?.query ?? ""}
            disabled={busy || full}
            invalid={state?.field === "query"}
            aria-describedby={state?.message ? FEEDBACK_ID : undefined}
          />
        </div>

        <div className="flex items-end">
          <Button type="submit" disabled={busy || full}>
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>
      </form>

      {full && (
        <p className="text-xs text-ink/50">
          This party is full. Remove someone to make room.
        </p>
      )}

      {/*
        Anything that is not a success, not only a rejection. The client-side
        check returns `kind: "invalid"` rather than `"rejected"` — that is the
        distinction `useFormAction` draws between "never went over the wire" and
        "the server said no" — so testing for `rejected` alone left a typed
        query with no message at all.
      */}
      <FormAlert id={FEEDBACK_ID}>
        {state && state.kind !== "success" ? state.message : null}
      </FormAlert>

      {results !== null && results.length === 0 && (
        <p className="text-sm text-ink/50 italic">No characters match that.</p>
      )}

      {results !== null && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((character) => (
            <li
              key={character.id}
              className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${NESTED_CARD_CLASSES}`}
            >
              <MemberIdentity character={character} />

              <div className="ml-auto">
                {inParty.has(character.id) ? (
                  <p className="text-xs text-ink/50">Already in this party.</p>
                ) : (
                  <Button
                    onClick={() =>
                      run(() => addCharacterToParty(campaignId, character.id))
                    }
                    disabled={busy || full}
                  >
                    Add
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}

      <div>
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          In this party
        </h3>

        {members.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50 italic">
            Nobody yet. Search for a character above.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {members.map((member) => (
              <li
                key={member.id}
                className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${NESTED_CARD_CLASSES}`}
              >
                <MemberIdentity character={member} />

                <button
                  type="button"
                  onClick={() =>
                    run(() => removeCharacterFromParty(campaignId, member.id))
                  }
                  disabled={busy}
                  aria-label={`Remove ${member.name}#${member.discriminator} from the party`}
                  className="ml-auto cursor-pointer font-display text-sm tracking-wide text-ink/60 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MemberIdentity({ character }) {
  const path = character.pathLabel;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        initials={characterInitials(character.name)}
        colorClass={avatarColorClass(character.color_theme)}
      />

      <div className="min-w-0">
        <p className="truncate font-display text-base font-semibold tracking-wide text-ink">
          {character.name}
        </p>
        <p className="font-mono text-xs text-gold/70">
          {character.name}#{character.discriminator}
        </p>
        <p className="mt-0.5 font-display text-[10px] tracking-[0.15em] text-ink/50 uppercase">
          {character.race}
          {path ? ` · ${path}` : ""}
        </p>
      </div>
    </div>
  );
}

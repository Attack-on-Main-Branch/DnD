"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { MAX_PARTY, parseCharacterQuery } from "sina/rules/campaign";

import { useLiveRefresh } from "@/app/components/notifications/use-live-refresh";
import Avatar from "@/app/components/ui/avatar";
import Button from "@/app/components/ui/button";
import {
  controlClasses,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import { diceColorClass } from "@/app/dashboard/character-presentation";

import {
  inviteCharacterToParty,
  removeCharacterFromParty,
} from "../../actions";

/**
 * The party: who is in it, and how to ask somebody to join.
 *
 * The search answers as it is typed, the way the pack's and the spellbook's do:
 * debounced rather than fired per keystroke, the in-flight request aborted when
 * a newer one starts, and the answer remembering WHICH TERM it belongs to so one
 * that landed first is never shown against a query it did not answer.
 *
 * A fragment rather than a whole handle, since a Dungeon Master usually has a
 * name somebody said out loud — and a list to pick from, because two characters
 * can differ only in their four digits and belong to different people.
 *
 * Picking one sends an invitation rather than adding the character. The row
 * appears below when its player accepts, which is a moment this page cannot
 * predict — hence the subscription.
 */

const DEBOUNCE_MS = 250;

const NOTHING = { term: null, characters: [] };
export default function PartyPanel({ campaignId, members }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [invited, setInvited] = useState(() => new Set());
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useLiveRefresh({
    channel: `party:${campaignId}`,
    table: "campaign_members",
    filter: `campaign_id=eq.${campaignId}`,
    onChange: refresh,
  });

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(NOTHING);
  const inFlight = useRef(null);

  const term = query.trim();

  /* The rules layer decides what counts as a query — "fern#04", "fern", "0451"
     — and anything it refuses is somebody mid-type rather than a mistake to
     complain about. */
  const searchable = Boolean(parseCharacterQuery(term));

  useEffect(() => {
    const wanted = query.trim();

    if (!parseCharacterQuery(wanted)) {
      inFlight.current?.abort();
      inFlight.current = null;
      return undefined;
    }

    const timer = setTimeout(() => {
      inFlight.current?.abort();

      const controller = new AbortController();
      inFlight.current = controller;

      fetch(`/api/characters/search?q=${encodeURIComponent(wanted)}`, {
        signal: controller.signal,
      })
        .then((response) =>
          response.ok ? response.json() : { characters: [] },
        )
        .then((body) =>
          setAnswer({ term: wanted, characters: body.characters ?? [] }),
        )
        // An aborted fetch rejects, and a superseded search has nothing to
        // report: whatever replaced it will set the state.
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const shown = answer.term === term ? answer : NOTHING;
  const searching = searchable && answer.term !== term;

  const full = members.length >= MAX_PARTY;
  const inParty = new Set(members.map((member) => member.id));

  function run(work, onDone) {
    setError(null);

    startTransition(async () => {
      const result = await work();

      if (result?.kind === "rejected") {
        setError(result.message);
        return;
      }

      onDone?.();
    });
  }

  const busy = isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <h3 className="font-display text-sm font-semibold tracking-wide text-ink/85">
          Invite a character
        </h3>

        <p className="font-mono text-[10px] tracking-[0.2em] text-ink/50 uppercase">
          {members.length} of {MAX_PARTY}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="party-search" className={LABEL_CLASSES}>
          Search
        </label>

        <input
          id="party-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or id"
          autoComplete="off"
          disabled={full}
          className={controlClasses({ className: "search-clear" })}
        />
      </div>

      {full && (
        <p className="text-xs text-ink/50">
          This party is full. Remove someone to make room.
        </p>
      )}

      {invited.size > 0 && !full && (
        <p className="text-xs text-ink/50">
          An invitation waits in its player&rsquo;s keeping until they answer.
        </p>
      )}

      {searchable && shown.characters.length === 0 && (
        <p className="text-sm text-ink/50 italic">
          {searching ? "Looking…" : "No characters match that."}
        </p>
      )}

      {shown.characters.length > 0 && (
        <ul className="flex flex-col gap-3">
          {shown.characters.map((character) => (
            <li
              key={character.id}
              className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${NESTED_CARD_CLASSES}`}
            >
              <MemberIdentity character={character} />

              <div className="ml-auto">
                {inParty.has(character.id) ? (
                  <p className="text-xs text-ink/50">Already in this party.</p>
                ) : invited.has(character.id) ? (
                  /* Local to this search, not a read of the table: an
                     outstanding invitation is in its recipient's inbox, and
                     nothing here may look in there. */
                  <p className="text-xs text-gold/70">Invitation sent.</p>
                ) : (
                  <Button
                    onClick={() =>
                      run(
                        () => inviteCharacterToParty(campaignId, character.id),
                        () =>
                          setInvited((current) =>
                            new Set(current).add(character.id),
                          ),
                      )
                    }
                    disabled={busy || full}
                  >
                    Invite
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
            Nobody yet. Invitations appear here once their players accept.
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
        src={character.avatar_url}
        colorClass={diceColorClass(character.dice_color)}
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

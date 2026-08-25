"use client";

import { useState, useTransition } from "react";
import {
  MAX_CAMPAIGN_CONTAINERS,
  MAX_CONTAINER_NAME_LENGTH,
} from "sina/rules/containers";
import { MAX_ITEM_QUANTITY, parseQuantity } from "sina/rules/inventory";

import Button from "@/app/components/ui/button";
import { controlClasses } from "@/app/components/ui/field-styles";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";
import { CONTAINER_KINDS } from "@/app/dashboard/container-presentation";

/* The table's own search, borrowed rather than written twice: finding an item
   is a paragraph of behaviour — debounce, abort, a term the answer remembers. */
import ItemSearch from "./play/item-search";
import { writeCampaignContainer } from "./container-actions";

/**
 * A bag or a chest, made: what kind, what it is called, and what is in it.
 *
 * THREE QUESTIONS AND NOT FIVE. It used to ask who carries a bag and who may
 * see a chest, and neither is a decision made away from the table — a bag is
 * handed to somebody in play, a chest is revealed when they find it. So
 * everything made here starts ownerless and hidden.
 *
 * The contents are found and not invented: homebrew is written down in the Item
 * tab beside this one, and the search reaches both it and the SRD.
 */

const FEEDBACK_ID = "campaign-container-feedback";

export default function ContainerForm({ campaignId, written }) {
  const [type, setType] = useState("bag");
  const [name, setName] = useState("");
  const [contents, setContents] = useState([]);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [isPending, startTransition] = useTransition();

  const kind = CONTAINER_KINDS.find((one) => one.value === type);

  const full = written >= MAX_CAMPAIGN_CONTAINERS;
  const blocked = isPending || full;

  /** A search hit pressed. Already chosen is one more of it, not a second row. */
  function add(item) {
    setPicked(item.slug);
    setNote(null);

    setContents((held) =>
      held.some((one) => one.slug === item.slug)
        ? held.map((one) =>
            one.slug === item.slug
              ? {
                  ...one,
                  quantity: Math.min(MAX_ITEM_QUANTITY, one.quantity + 1),
                }
              : one,
          )
        : [...held, { ...item, quantity: 1 }],
    );
  }

  function setQuantity(slug, typed) {
    setContents((held) =>
      held.map((one) => (one.slug === slug ? { ...one, typed } : one)),
    );
  }

  function drop(slug) {
    setContents((held) => held.filter((one) => one.slug !== slug));
  }

  /** Switching kinds keeps the name and the contents; both mean the same. */
  function choose(value) {
    setType(value);
    setError(null);
    setNote(null);
  }

  function make(event) {
    event.preventDefault();

    if (blocked) {
      return;
    }

    /* Read on the way OUT, so clearing a field to retype it does not snap
       back to 1 under the pointer. */
    const items = contents.map((one) => ({
      ...one,
      quantity: parseQuantity(one.typed ?? one.quantity) ?? one.quantity,
    }));

    startTransition(async () => {
      /* No owner and no audience: both are the table's to decide. */
      const result = await writeCampaignContainer(campaignId, {
        name,
        type,
        items,
      });

      if (result?.kind === "rejected") {
        setError(result.message);
        setNote(null);
        return;
      }

      setName("");
      setContents([]);
      setPicked(null);
      setError(null);
      setNote(`${result.name} is on the table.`);
    });
  }

  return (
    <form onSubmit={make} className="mt-4 flex flex-col gap-4">
      {/* A group of two rather than a tab strip: these select a SHAPE. */}
      <fieldset disabled={blocked} className="flex flex-col gap-2">
        <legend className="font-display text-sm font-medium tracking-wide text-ink/85">
          Kind
        </legend>

        <div
          role="radiogroup"
          aria-label="Kind"
          className="flex flex-wrap gap-2"
        >
          {CONTAINER_KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              role="radio"
              aria-checked={type === one.value}
              onClick={() => choose(one.value)}
              className={`cursor-pointer rounded-full border px-4 py-1.5 font-display text-xs tracking-wide transition duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                type === one.value
                  ? "border-gold/55 bg-gold/15 text-gold"
                  : "border-gold/20 bg-surface/40 text-ink/70 hover:border-gold/45 hover:text-gold"
              }`}
            >
              {one.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-ink/50">{kind.hint}</p>
      </fieldset>

      <TextField
        label="Name"
        value={name}
        maxLength={MAX_CONTAINER_NAME_LENGTH}
        onChange={(event) => setName(event.target.value)}
        placeholder={kind.placeholder}
        disabled={blocked}
        aria-describedby={FEEDBACK_ID}
      />

      <section aria-label="What is inside" className="flex flex-col gap-2">
        <h3 className="font-display text-sm font-medium tracking-wide text-ink/85">
          Initial contents
        </h3>

        <ItemSearch campaignId={campaignId} openSlug={picked} onOpen={add} />

        {contents.length === 0 ? (
          <p className="text-xs text-ink/50 italic">
            Nothing in it yet. Anything you find above goes in — press it again
            for one more.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contents.map((one) => (
              <li
                key={one.slug}
                className="flex items-center gap-3 rounded-lg border border-gold/15 bg-surface/50 px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate font-display text-xs tracking-wide text-ink/85">
                  {one.name}
                </span>

                {/* Width on the wrapper: `controlClasses` carries `w-full`. */}
                <div className="w-16 shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={one.typed ?? String(one.quantity)}
                    onChange={(event) =>
                      setQuantity(one.slug, event.target.value)
                    }
                    aria-label={`How many ${one.name}`}
                    disabled={blocked}
                    className={controlClasses({
                      className: "px-2 py-1 text-center tabular-nums",
                    })}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => drop(one.slug)}
                  disabled={blocked}
                  aria-label={`Take ${one.name} back out`}
                  className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide text-ink/60 transition-colors duration-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-ink/25"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* What happens to it NEXT, said rather than asked — see the head. */}
      <p className="text-xs text-ink/50">
        {type === "chest"
          ? "It stays out of sight until you reveal it from the table."
          : "It belongs to the whole party until somebody is handed it at the table."}
      </p>

      <FormAlert id={FEEDBACK_ID}>{error}</FormAlert>
      <FormAlert tone="success">{note}</FormAlert>

      <div className="flex justify-end">
        <Button type="submit" disabled={blocked || name.trim().length === 0}>
          {isPending ? "Making…" : "Create container"}
        </Button>
      </div>
    </form>
  );
}

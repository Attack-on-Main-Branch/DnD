"use client";

import { useState } from "react";
import {
  MAX_FEATURE_DESCRIPTION_LENGTH,
  MAX_FEATURE_NAME_LENGTH,
} from "sina/rules/features";
import { countCharacters } from "sina/rules/text";

import Button from "@/app/components/ui/button";
import {
  controlClasses,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";

/**
 * A name and what it does. The two boxes every surface that writes a feature
 * uses — the sheet's own tab, the Dungeon Master's Create tab, and the drawer at
 * the table — so the three cannot ask for different things.
 *
 * `sina/rules/text` rather than `sina/rules/features` for the counter's own
 * arithmetic: this runs in the browser, and the bound comes from the rules
 * layer either way.
 *
 * IT DOES NOT WRITE. `onWrite` is handed the two strings and answers with a
 * rejection or nothing; who the feature is FOR is the caller's question, and it
 * differs at every call site.
 */
export default function FeatureForm({
  onWrite,
  disabled = false,
  children = null,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const nameLength = countCharacters(name);
  const bodyLength = countCharacters(description);

  const nameTooLong = nameLength > MAX_FEATURE_NAME_LENGTH;
  const bodyTooLong = bodyLength > MAX_FEATURE_DESCRIPTION_LENGTH;

  const ready =
    name.trim() !== "" &&
    description.trim() !== "" &&
    !nameTooLong &&
    !bodyTooLong;

  async function write() {
    if (!ready || busy || disabled) {
      return;
    }

    setBusy(true);

    const refused = await onWrite({ name, description });

    setBusy(false);

    // Emptied only once it has landed: a refusal leaves the words where they
    // are, which is the one thing a form must never take away.
    if (!refused) {
      setName("");
      setDescription("");
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className={LABEL_CLASSES} htmlFor="feature-name">
          Name
        </label>

        <input
          id="feature-name"
          type="text"
          value={name}
          maxLength={MAX_FEATURE_NAME_LENGTH * 2}
          onChange={(event) => setName(event.target.value)}
          placeholder="Darkvision"
          disabled={disabled || busy}
          aria-invalid={nameTooLong || undefined}
          className={controlClasses({ invalid: nameTooLong })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={LABEL_CLASSES} htmlFor="feature-description">
          Description
        </label>

        <textarea
          id="feature-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What it lets this character do."
          disabled={disabled || busy}
          aria-invalid={bodyTooLong || undefined}
          className={controlClasses({
            invalid: bodyTooLong,
            className: "scroll-gold resize-none",
          })}
        />

        <p
          className={`text-right font-mono text-[10px] tracking-[0.16em] tabular-nums uppercase ${
            bodyTooLong ? "text-red-300" : "text-ink/45"
          }`}
        >
          {bodyLength} / {MAX_FEATURE_DESCRIPTION_LENGTH}
        </p>
      </div>

      {/* Whatever the call site needs between the boxes and the button — the
          Dungeon Master's is who this is for. */}
      {children}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={write}
          disabled={!ready || busy || disabled}
        >
          Write feature
        </Button>
      </div>
    </div>
  );
}

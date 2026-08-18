"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import Button, { buttonClasses } from "@/app/components/ui/button";
import { LABEL_CLASSES } from "@/app/components/ui/field-styles";
import FormAlert from "@/app/components/ui/form-alert";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import TextAreaField from "@/app/components/ui/textarea-field";
import TextField from "@/app/components/ui/text-field";
import { useFormAction } from "@/app/components/use-form-action";
import { compressImage, MAX_EDGE } from "@/lib/image-compression";

import {
  formatBytes,
  MAP_ACCEPT_ATTRIBUTE,
  MAX_LORE_LENGTH,
  MAX_MAP_BYTES,
  readCampaignValues,
  validateCampaign,
} from "sina/rules/campaign";
import { countCharacters } from "sina/rules/character";

import { createCampaign } from "./actions";

const FEEDBACK_ID = "campaign-feedback";

/**
 * The Dungeon Master's half of the creation flow: a campaign, its lore, and a
 * map.
 *
 * The map is re-encoded in the browser before it is ever sent — see
 * `lib/image-compression`. That is not only a bandwidth decision: the file
 * travels to the server inside the Server Action's body, so its size is
 * bounded by `serverActions.bodySizeLimit` rather than by the bucket, and a
 * 6MB export would be refused by the framework before any of our code could
 * say why.
 *
 * Controlled throughout, like the character sheet: a rejected title must not
 * cost the DM the world description they just wrote, or make them pick the map
 * again.
 */
export default function CreateCampaignPanel({ onCreated }) {
  const [title, setTitle] = useState("");
  const [worldDescription, setWorldDescription] = useState("");
  const [map, setMap] = useState(null);

  /*
   * Whether the picked map is still being re-encoded.
   *
   * It lives up here rather than inside MapField because the submit button is
   * what has to know. Compression starts when the file is chosen and the result
   * is written back into the file input afterwards, so until it finishes the
   * input still holds the original — and pressing Create in that window would
   * upload the very megabytes this panel exists to avoid, or trip the size
   * check on a file that was about to pass it.
   */
  const [mapBusy, setMapBusy] = useState(false);

  const titleRef = useRef(null);

  const { state, formAction, isPending } = useFormAction({
    action: createCampaign,
    read: readCampaignValues,
    validate: validateCampaign,
    onResult: (result) => {
      if (result?.kind === "success") {
        onCreated();
      }
    },
    refocusRef: titleRef,
  });

  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-wide">
          Dungeon Master
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          Name the campaign and set the scene. The map can come later.
        </p>
      </div>

      <TextField
        label="Campaign title"
        name="title"
        type="text"
        autoComplete="off"
        placeholder="The Sunless Citadel"
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "title"}
        inputRef={titleRef}
        aria-describedby={describedBy}
      />

      {/*
        No `maxLength`, and the counter uses `countCharacters`, for the same
        reason the character sheet's prose fields do not: the attribute counts
        UTF-16 units and the rule counts code points, and no single number
        reconciles the two. `validateCampaign` governs alone, here and on the
        server.
      */}
      <TextAreaField
        label="World lore"
        name="worldDescription"
        rows={6}
        placeholder="What the party already knows about this world."
        hint={`${countCharacters(worldDescription)}/${MAX_LORE_LENGTH}`}
        value={worldDescription}
        onChange={(event) => setWorldDescription(event.target.value)}
        disabled={isPending}
        invalid={state?.field === "worldDescription"}
        aria-describedby={describedBy}
      />

      <MapField
        map={map}
        onChange={setMap}
        onBusyChange={setMapBusy}
        disabled={isPending}
        invalid={state?.field === "map"}
      />

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gold/15 pt-5">
        {/* Cancel rather than Back, and a link — see the note on the character
            sheet's copy of this row. */}
        <Link
          href="/dashboard"
          prefetch={false}
          className={buttonClasses({ variant: "secondary" })}
        >
          Cancel
        </Link>
        <Button type="submit" disabled={isPending || mapBusy}>
          {isPending ? "Creating…" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Drop a map on it, or pick one.
 *
 * The compression runs the moment a file is chosen rather than on submit, so
 * the DM sees what will actually be uploaded — and so the wait happens while
 * they are still reading the form instead of after they have pressed the
 * button.
 */
function MapField({ map, onChange, onBusyChange, disabled, invalid }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  // The compressed file has to reach the form somehow, and a file input's
  // `files` cannot be assigned a File directly — only a DataTransfer's list.
  // This is what puts the re-encoded map where the submit will find it.
  useEffect(() => {
    const input = inputRef.current;

    if (!input || typeof DataTransfer === "undefined") {
      return;
    }

    const transfer = new DataTransfer();

    if (map?.file) {
      transfer.items.add(map.file);
    }

    input.files = transfer.files;
  }, [map]);

  // An object URL is a document-lifetime reference to the whole decoded image.
  // Revoking the previous one on every change is what keeps choosing five maps
  // in a row from holding five of them.
  useEffect(() => {
    const url = map?.preview;

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [map?.preview]);

  async function accept(file) {
    if (!file) {
      return;
    }

    setProblem(null);
    setBusy(true);
    onBusyChange(true);

    try {
      const result = await compressImage(file);

      if (result.file.size > MAX_MAP_BYTES) {
        setProblem(
          `That map is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_MAP_BYTES)} limit.`,
        );
        onChange(null);
        return;
      }

      onChange({
        ...result,
        preview: URL.createObjectURL(result.file),
      });
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!disabled) {
      accept(event.dataTransfer.files?.[0]);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL_CLASSES}>World map</span>
        <span className="text-xs text-ink/50">Optional</span>
      </div>

      {/*
        A label wrapping a file input, not a div with a click handler. The
        input is the control — it carries the keyboard focus, the accessible
        name and the picker — and the drop zone is its appearance.
      */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center transition duration-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold/70 ${
          dragging ? "border-gold/60 bg-gold/5" : NESTED_CARD_CLASSES
        } ${invalid ? "border-red-500/50" : ""} ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          name="map"
          accept={MAP_ACCEPT_ATTRIBUTE}
          disabled={disabled}
          onChange={(event) => accept(event.target.files?.[0])}
          className="sr-only"
        />

        {map ? (
          <>
            {/*
              A plain <img>, not next/image, and the rule is disabled rather
              than worked around: this is a `blob:` URL for a file the visitor
              picked a moment ago. The optimiser would have nothing to fetch —
              it cannot reach a URL that exists only in this tab — and the
              bandwidth the rule exists to save was already spent by the
              browser that decoded the file.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={map.preview}
              alt=""
              className="max-h-52 w-auto rounded-md border border-gold/15 object-contain"
            />

            <span className="font-mono text-xs text-ink/60">
              {map.width}×{map.height} · {formatBytes(map.bytes)}
              {map.changed && (
                <span className="text-gold/70">
                  {" "}
                  · compressed from {formatBytes(map.originalBytes)}
                </span>
              )}
            </span>

            <span className="text-xs text-ink/50">
              Drop another to replace it
            </span>
          </>
        ) : (
          <>
            <span className="font-display text-base font-semibold tracking-wide text-ink">
              {busy ? "Compressing…" : "Drop a map here"}
            </span>
            <span className="text-xs leading-relaxed text-pretty text-ink/50">
              {busy
                ? "Resizing and converting to WebP in your browser."
                : `PNG, JPEG, GIF or WebP. Anything wider than ${MAX_EDGE}px is scaled down and converted to WebP before it leaves this page.`}
            </span>
          </>
        )}
      </label>

      {problem && (
        <p role="alert" className="text-xs text-red-400">
          {problem}
        </p>
      )}

      {map && (
        <div className="flex justify-end">
          <Button
            variant="link"
            onClick={() => {
              setProblem(null);
              onChange(null);
            }}
            disabled={disabled}
          >
            Remove map
          </Button>
        </div>
      )}
    </div>
  );
}

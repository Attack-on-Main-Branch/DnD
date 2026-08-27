"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import { updateCampaign } from "@/app/actions/campaigns";
import Button, { buttonClasses } from "@/app/components/ui/button";
import {
  CHOICE_CARD_FOCUS_CLASSES,
  INVALID_BORDER_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
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
import MapSlots from "./map-slots";

const FEEDBACK_ID = "campaign-feedback";

/**
 * The Dungeon Master's sheet, written for the first time or read back and
 * changed — one component, for the reason player-character-form.jsx gives.
 *
 * The map is re-encoded in the browser first (`lib/image-compression`), and not
 * only for bandwidth: the file travels inside the Server Action's body, so an
 * oversized export is refused by `serverActions.bodySizeLimit` before our code
 * can say why.
 *
 * Controlled throughout, so a rejected title does not cost the lore or the map.
 */
export default function CampaignForm({
  campaign = null,
  maps = [],
  onDone,
  onCancel = null,
  onPending = null,
}) {
  const editing = Boolean(campaign);

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [worldDescription, setWorldDescription] = useState(
    campaign?.world_description ?? "",
  );
  const [map, setMap] = useState(null);

  /* The map already in storage, until it is taken away. Separate from `map`
     above: that one is a file to upload, this a URL to leave alone — and
     "leave it" and "take it away" both look like no file to the server, which
     is what the hidden `keepMap` field is for. */
  const [keptMapUrl, setKeptMapUrl] = useState(campaign?.map_url ?? null);

  /* Up here rather than in MapField because the submit button has to know:
     the input holds the original until compression finishes, so a press in
     that window uploads the megabytes this panel exists to avoid. */
  const [mapBusy, setMapBusy] = useState(false);

  /* The shelf under the world map, as the sheet wants it to end up. Stored
     rows arrive already on it; a slot removed here is removed on save, which
     is what `readCampaignMaps` reads out of what this posts. */
  const [slots, setSlots] = useState(() =>
    maps
      .filter((map) => !map.is_world_map)
      .map((map) => ({
        key: map.id,
        id: map.id,
        name: map.name,
        file: null,
        url: map.url,
        bytes: 0,
      })),
  );

  const [slotsBusy, setSlotsBusy] = useState(false);

  const titleRef = useRef(null);

  const { state, formAction, isPending } = useFormAction({
    // Bound rather than posted as a hidden input — see the note on the
    // character sheet's copy of this. `update_campaign` checks it regardless.
    action: editing
      ? (_previous, formData) => updateCampaign(campaign.id, formData)
      : createCampaign,
    read: readCampaignValues,
    validate: validateCampaign,
    onResult: (result) => {
      if (result?.kind === "success") {
        onDone();
      }
    },
    refocusRef: titleRef,
  });

  // Passed up so the modal holding this can refuse to shut mid-save — see the
  // note on the character sheet's copy.
  useEffect(() => {
    onPending?.(isPending);
  }, [isPending, onPending]);

  const describedBy = state?.message ? FEEDBACK_ID : undefined;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-wide">
          Dungeon Master
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          {editing
            ? "Change what the party knows, or hang a new map on the wall."
            : "Name the campaign and set the scene. The map can come later."}
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
        keptUrl={keptMapUrl}
        onChange={setMap}
        onDropKept={() => setKeptMapUrl(null)}
        onBusyChange={setMapBusy}
        disabled={isPending}
        invalid={state?.field === "map"}
      />

      {/* Directly under the world map, because that is the relationship: one
          picture the campaign IS, and a shelf of the ones it can put on the
          table during a session. */}
      <MapSlots
        slots={slots}
        onChange={setSlots}
        onBusyChange={setSlotsBusy}
        disabled={isPending}
        invalid={state?.field === "maps"}
      />

      <FormAlert id={FEEDBACK_ID}>{state?.message}</FormAlert>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gold/15 pt-5">
        {/* Cancel rather than Back — see the note on the character sheet's
            copy of this row for why one is a button and the other a link. */}
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : (
          <Link
            href="/dashboard"
            prefetch={false}
            className={buttonClasses({ variant: "secondary" })}
          >
            Cancel
          </Link>
        )}
        <Button type="submit" disabled={isPending || mapBusy || slotsBusy}>
          {editing
            ? isPending
              ? "Saving…"
              : "Save changes"
            : isPending
              ? "Creating…"
              : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Drop a map on it, or pick one. Compression runs the moment a file is chosen
 * rather than on submit, so the wait happens while the form is still being
 * filled in and the DM sees what will actually be uploaded.
 *
 * `keptUrl` is the map already in storage. A newly picked file wins the preview
 * while it is there, and Remove clears both — which is what turns the hidden
 * `keepMap` field off and tells the server the column should be emptied.
 */
function MapField({
  map,
  keptUrl,
  onChange,
  onDropKept,
  onBusyChange,
  disabled,
  invalid,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  // Two picks in flight resolve in completion order, not pick order, so without
  // this the slower run wins the preview and the faster one clears `busy` while
  // the other is still working.
  const runId = useRef(0);

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

  // An object URL holds the whole decoded image for the document's lifetime, so
  // the previous one is revoked on every change.
  useEffect(() => {
    const url = map?.preview;

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [map?.preview]);

  // The DataTransfer effect below is keyed on `map`, and a reject leaves `map`
  // at the null it already held — so nothing re-runs and the element keeps the
  // file the form would then refuse to submit, with no way to clear it and no
  // `change` event if the same file is picked again.
  function reject(message) {
    setProblem(message);
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function accept(file) {
    if (!file) {
      return;
    }

    const run = ++runId.current;

    setProblem(null);
    setBusy(true);
    onBusyChange(true);

    try {
      const result = await compressImage(file);

      // A newer pick started while this one was encoding; it owns the field.
      if (run !== runId.current) {
        return;
      }

      if (result.decodable === false) {
        reject(
          "That file could not be read as an image. Try a PNG, JPEG or WebP.",
        );
        return;
      }

      if (result.file.size > MAX_MAP_BYTES) {
        reject(
          `That map is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_MAP_BYTES)} limit.`,
        );
        return;
      }

      onChange({
        ...result,
        preview: URL.createObjectURL(result.file),
      });
    } finally {
      if (run === runId.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!disabled) {
      accept(event.dataTransfer.files?.[0]);
    }
  }

  // Mutually exclusive, so no state can be overridden by the one after it. The
  // invalid branch restates its own hover, since it is replacing a resting
  // style that carries one.
  const zone = dragging
    ? "border-gold/60 bg-gold/5"
    : invalid
      ? `${INVALID_BORDER_CLASSES} bg-surface/60 hover:border-red-400`
      : NESTED_CARD_CLASSES;

  // A newly picked file wins: it is what the submit will actually upload.
  const preview = map?.preview ?? keptUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL_CLASSES}>World map</span>
        <span className="text-xs text-ink/50">Optional</span>
      </div>

      {/*
        The stored map's fate, in one field. Present while there is a map to
        keep, absent once Remove has been pressed — see `readCampaignValues`,
        which reads it as the difference between leaving the column alone and
        emptying it. Creation never has one to keep and never sends it.
      */}
      {keptUrl && <input type="hidden" name="keepMap" value="1" />}

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
        // One zone class, not three overlapping ones. Appended, the invalid
        // border lost to NESTED_CARD_CLASSES' `hover:border-gold/45`, so the
        // error state vanished under the pointer, and `cursor-not-allowed` lost
        // to the base `cursor-pointer` on emit order. `has-focus-visible`
        // rather than `focus-within`, or clicking the label lights the zone up
        // for a mouse user.
        className={`flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${zone}`}
        aria-invalid={invalid || undefined}
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

        {preview ? (
          <>
            {/*
              A plain <img>, not next/image, and the rule is disabled rather
              than worked around. For a picked file this is a `blob:` URL the
              optimiser cannot reach — it exists only in this tab — and the
              bandwidth the rule exists to save was already spent by the
              browser that decoded it. The stored map takes the same element on
              purpose: these two previews are one box, and a map that changed
              size when it was replaced would read as a different control.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="max-h-52 w-auto rounded-md border border-gold/15 object-contain"
            />

            {map ? (
              <span className="font-mono text-xs text-ink/60">
                {map.width}×{map.height} · {formatBytes(map.bytes)}
                {map.changed && (
                  <span className="text-gold/70">
                    {" "}
                    · compressed from {formatBytes(map.originalBytes)}
                  </span>
                )}
              </span>
            ) : (
              <span className="font-mono text-xs text-ink/60">
                The map this campaign is using
              </span>
            )}

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

      {preview && (
        <div className="flex justify-end">
          <Button
            variant="link"
            onClick={() => {
              setProblem(null);
              onChange(null);
              onDropKept();
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

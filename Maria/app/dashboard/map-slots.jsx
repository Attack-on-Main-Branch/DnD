"use client";

import { useEffect, useRef, useState } from "react";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  controlClasses,
  INVALID_BORDER_CLASSES,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { NESTED_CARD_CLASSES } from "@/app/components/ui/surface";
import { compressMap } from "@/lib/image-compression";

import {
  DEFAULT_MAP_NAME,
  formatBytes,
  MAP_ACCEPT_ATTRIBUTE,
  MAX_EXTRA_MAPS,
  MAX_MAP_BYTES,
  MAX_MAP_NAME_LENGTH,
} from "sina/rules/campaign";

/**
 * The shelf, under the world map on the same sheet: the dungeons, the taverns
 * and the regional maps a session switches between.
 *
 * THE SHEET DESCRIBES THE SHELF IT WANTS, not the difference. A stored slot
 * posts its id as `mapKept`; a dropped one posts nothing, and that absence is
 * the delete. See `readCampaignMaps` and `applyMapShelf`.
 *
 * The world map is not one of these — it is the field above, and not one of
 * the ten.
 */
export default function MapSlots({
  slots,
  onChange,
  onBusyChange,
  disabled,
  invalid,
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0);
  const [problem, setProblem] = useState(null);

  const inputRef = useRef(null);

  const full = slots.length >= MAX_EXTRA_MAPS;
  const room = MAX_EXTRA_MAPS - slots.length;

  // Told upward as a boolean, so the submit button can refuse while a picture
  // is still being re-encoded — the same reason the world map's field does it.
  useEffect(() => {
    onBusyChange(busy > 0);
  }, [busy, onBusyChange]);

  async function accept(files) {
    const chosen = [...files].filter(Boolean).slice(0, room);

    if (chosen.length === 0) {
      return;
    }

    setProblem(null);
    setBusy((count) => count + chosen.length);

    for (const file of chosen) {
      try {
        const result = await compressMap(file, MAX_MAP_BYTES);

        if (result.decodable === false) {
          setProblem(`${file.name} could not be read as an image.`);
          continue;
        }

        if (result.file.size > MAX_MAP_BYTES) {
          setProblem(
            `${file.name} is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_MAP_BYTES)} limit.`,
          );
          continue;
        }

        onChange((standing) =>
          standing.length >= MAX_EXTRA_MAPS
            ? standing
            : [
                ...standing,
                {
                  key: crypto.randomUUID(),
                  id: null,
                  name: nameFrom(file.name),
                  file: result.file,
                  url: URL.createObjectURL(result.file),
                  bytes: result.bytes,
                },
              ],
        );
      } finally {
        setBusy((count) => count - 1);
      }
    }

    // Or the same file picked twice in a row fires no `change` event.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!disabled) {
      accept(event.dataTransfer.files ?? []);
    }
  }

  function rename(key, name) {
    onChange((standing) =>
      standing.map((slot) => (slot.key === key ? { ...slot, name } : slot)),
    );
  }

  function drop(key) {
    onChange((standing) => {
      const going = standing.find((slot) => slot.key === key);

      // A blob URL holds the decoded picture for the document's life.
      if (going?.file) {
        URL.revokeObjectURL(going.url);
      }

      return standing.filter((slot) => slot.key !== key);
    });
  }

  const zone = dragging
    ? "border-gold/60 bg-gold/5"
    : invalid
      ? `${INVALID_BORDER_CLASSES} bg-surface/60 hover:border-red-400`
      : NESTED_CARD_CLASSES;

  return (
    <div className="flex flex-col gap-1.5">
      {/* "This sheet is talking about the shelf." Without it a save describes
          an empty one, which reads as every map removed. */}
      <input type="hidden" name="mapShelf" value="1" />

      <div className="flex items-baseline justify-between gap-3">
        <span className={LABEL_CLASSES}>Additional maps</span>

        {/* The counter is the whole of what says a shelf can be full. */}
        <span className="font-mono text-xs tracking-[0.2em] text-ink/50 uppercase">
          {slots.length} / {MAX_EXTRA_MAPS} maps
        </span>
      </div>

      {slots.length > 0 && (
        <ul className="mb-1 grid gap-3 sm:grid-cols-2">
          {slots.map((slot) => (
            <li
              key={slot.key}
              className={`flex gap-3 rounded-lg border p-2 ${NESTED_CARD_CLASSES}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slot.url}
                alt=""
                className="h-14 w-20 shrink-0 rounded-md border border-gold/15 object-cover"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  type="text"
                  value={slot.name}
                  maxLength={MAX_MAP_NAME_LENGTH}
                  disabled={disabled}
                  onChange={(event) => rename(slot.key, event.target.value)}
                  placeholder={DEFAULT_MAP_NAME}
                  aria-label="Map name"
                  className={controlClasses({ className: "px-2 py-1 text-xs" })}
                />

                <span className="font-mono text-[10px] text-ink/40">
                  {slot.file ? formatBytes(slot.bytes) : "Stored"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => drop(slot.key)}
                disabled={disabled}
                aria-label={`Remove ${slot.name || DEFAULT_MAP_NAME}`}
                className="size-6 shrink-0 cursor-pointer self-start rounded-full border border-gold/25 text-sm leading-none text-ink/60 transition duration-300 hover:border-red-400/60 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>

              {/* A stored slot names itself; a new one carries its file. */}
              {slot.id ? (
                <>
                  <input type="hidden" name="mapKept" value={slot.id} />
                  <input
                    type="hidden"
                    name="mapKeptName"
                    value={slot.name || DEFAULT_MAP_NAME}
                  />
                </>
              ) : (
                <>
                  <FileSlot file={slot.file} />
                  <input
                    type="hidden"
                    name="mapFileName"
                    value={slot.name || DEFAULT_MAP_NAME}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* A label wrapping a file input: the input is the control. */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-1 rounded-lg border border-dashed p-4 text-center transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
          disabled || full ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${zone}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MAP_ACCEPT_ATTRIBUTE}
          disabled={disabled || full}
          onChange={(event) => accept(event.target.files ?? [])}
          className="sr-only"
        />

        <span className="font-display text-sm font-semibold tracking-wide text-ink">
          {busy > 0
            ? "Compressing…"
            : full
              ? "The shelf is full"
              : "Drop battle maps here"}
        </span>

        <span className="text-xs leading-relaxed text-pretty text-ink/50">
          {full
            ? `Remove one to add another. The world map above does not count towards the ${MAX_EXTRA_MAPS}.`
            : `Dungeons, taverns, regions — whatever the session switches to. Room for ${room} more.`}
        </span>
      </label>

      {problem && (
        <p role="alert" className="text-xs text-red-400">
          {problem}
        </p>
      )}
    </div>
  );
}

/** One staged file. A file input's `files` takes only a DataTransfer's list,
    which is the only way a re-encoded picture reaches the Server Action. */
function FileSlot({ file }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;

    if (!input || typeof DataTransfer === "undefined") {
      return;
    }

    const transfer = new DataTransfer();

    if (file) {
      transfer.items.add(file);
    }

    input.files = transfer.files;
  }, [file]);

  return (
    <input ref={inputRef} type="file" name="mapFile" className="sr-only" />
  );
}

/** "sunken-keep.png" → "Sunken keep". A first guess, and editable. */
function nameFrom(fileName) {
  const base = String(fileName ?? "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, MAX_MAP_NAME_LENGTH);

  return base ? base.charAt(0).toUpperCase() + base.slice(1) : DEFAULT_MAP_NAME;
}

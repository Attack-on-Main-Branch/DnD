"use client";

import { useEffect, useRef, useState } from "react";

import { Silhouette } from "@/app/components/ui/avatar";
import { CHOICE_CARD_FOCUS_CLASSES } from "@/app/components/ui/field-styles";
import { AVATAR_EDGE, compressAvatar } from "@/lib/image-compression";

import {
  AVATAR_ACCEPT_ATTRIBUTE,
  formatBytes,
  MAX_AVATAR_BYTES,
} from "sina/rules/character";

/**
 * The face at the top of the sheet, which is also where one is chosen: drop a
 * picture on it, or press it and pick one.
 *
 * The zone IS the avatar rather than a field beneath it, and re-encoding runs
 * on the pick rather than on submit — the file travels inside the Server
 * Action's body, so what is previewed is what will be uploaded.
 *
 * `keptUrl` is the portrait already in storage. A new file wins the preview,
 * and Remove clears both, which takes the hidden `keepAvatar` field away.
 */
export default function AvatarField({
  avatar,
  keptUrl,
  colorClass,
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
  useEffect(() => {
    const input = inputRef.current;

    if (!input || typeof DataTransfer === "undefined") {
      return;
    }

    const transfer = new DataTransfer();

    if (avatar?.file) {
      transfer.items.add(avatar.file);
    }

    input.files = transfer.files;
  }, [avatar]);

  // An object URL holds the whole decoded image for the document's lifetime, so
  // the previous one is revoked on every change.
  useEffect(() => {
    const url = avatar?.preview;

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [avatar?.preview]);

  /* The effect above is keyed on `avatar`, and a reject leaves it null — so
     nothing re-runs and the element keeps a file the form would refuse. */
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
      const result = await compressAvatar(file);

      // A newer pick started while this one was encoding; it owns the field.
      if (run !== runId.current) {
        return;
      }

      if (result.decodable === false) {
        reject("That file could not be read as an image.");
        return;
      }

      if (result.file.size > MAX_AVATAR_BYTES) {
        reject(
          `That picture is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_AVATAR_BYTES)} limit.`,
        );
        return;
      }

      onChange({ ...result, preview: URL.createObjectURL(result.file) });
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

  // A newly picked file wins: it is what the submit will actually upload.
  const preview = avatar?.preview ?? keptUrl;

  // Mutually exclusive, so none can be overridden by the one after it.
  const rim = dragging
    ? "border-gold/70 bg-gold/10"
    : invalid
      ? "border-red-400/60"
      : "border-gold/25 hover:border-gold/55";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {/* The stored portrait's fate, in one field: present while there is
            one to keep, absent once Remove has been pressed. */}
        {keptUrl && <input type="hidden" name="keepAvatar" value="1" />}

        {/* A label wrapping a file input: the input is the control. */}
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`group relative grid size-20 place-items-center overflow-hidden rounded-full border border-dashed transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${preview ? "" : colorClass} ${rim}`}
          aria-invalid={invalid || undefined}
        >
          <input
            ref={inputRef}
            type="file"
            name="avatar"
            accept={AVATAR_ACCEPT_ATTRIBUTE}
            disabled={disabled}
            onChange={(event) => accept(event.target.files?.[0])}
            className="sr-only"
          />

          {/* A plain <img>: a picked file is a `blob:` URL the optimiser
              cannot reach, and the stored one takes the same element so the
              two previews are one box. Empty, it is the same cameo every card
              in the app shows. */}
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <Silhouette />
          )}

          {/* Always drawn and only revealed: a scrim that mounts on hover
              cannot be transitioned in, and reads as a flicker. */}
          <span
            className={`absolute inset-0 grid place-items-center bg-surface/75 text-center font-display text-[10px] leading-tight tracking-[0.12em] text-gold uppercase transition-opacity duration-300 ${
              busy || dragging
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100"
            }`}
          >
            {busy ? "…" : preview ? "Change" : "Portrait"}
          </span>
        </label>

        {/* Outside the label, or the label's click reaches the input first.
            Pinned to the rim, so removing costs no row of its own. */}
        {preview && !disabled && (
          <button
            type="button"
            onClick={() => {
              setProblem(null);
              onChange(null);
              onDropKept();

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            aria-label="Remove the portrait"
            className="absolute -top-0.5 -right-0.5 grid size-6 cursor-pointer place-items-center rounded-full border border-gold/30 bg-surface/90 text-sm leading-none text-ink/60 transition duration-300 hover:border-red-400/60 hover:text-red-400"
          >
            ×
          </button>
        )}
      </div>

      {problem ? (
        <p role="alert" className="max-w-40 text-center text-xs text-red-400">
          {problem}
        </p>
      ) : (
        <p className="font-mono text-[10px] text-ink/40">
          {avatar ? formatBytes(avatar.bytes) : `${AVATAR_EDGE}px WebP`}
        </p>
      )}
    </div>
  );
}

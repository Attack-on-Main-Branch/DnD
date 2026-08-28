"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  formatBytes,
  MAX_CAMPAIGN_TOKENS,
  MAX_TOKEN_IMAGE_BYTES,
  MAX_TOKEN_NAME_LENGTH,
  TOKEN_ACCEPT_ATTRIBUTE,
} from "sina/rules/tokens";

import { writeCampaignToken } from "@/app/actions/campaign-tokens";
import Button from "@/app/components/ui/button";
import { CHOICE_CARD_FOCUS_CLASSES } from "@/app/components/ui/field-styles";
import FormAlert from "@/app/components/ui/form-alert";
import TextField from "@/app/components/ui/text-field";
import { AVATAR_EDGE, compressToken } from "@/lib/image-compression";

/**
 * A piece for the board: a picture and a name, and nothing else to decide.
 *
 * WHAT COLOUR IT WEARS IS NOT ASKED HERE. One invented piece is placed as many
 * times as the encounter needs, and the rim is what tells the copies apart — so
 * it belongs to the placement and not to the drawing. See rules/tokens.js.
 *
 * The zone IS the token rather than a field beneath it, and the re-encode runs
 * on the pick rather than on submit: the file travels inside the Server
 * Action's body, so what is previewed is what will be uploaded. Same bargain
 * avatar-field.jsx makes, on the one thing this form is about.
 */

const FEEDBACK_ID = "campaign-token-feedback";

export default function TokenForm({ campaignId, written }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);
  const [field, setField] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const full = written >= MAX_CAMPAIGN_TOKENS;
  const blocked = isPending || busy || full;

  function make(event) {
    event.preventDefault();

    if (blocked || !image?.file || name.trim().length === 0) {
      return;
    }

    /* Built by hand rather than read off the form: the picture lives in state
       because it was re-encoded there, and a file input's `files` cannot be
       assigned a File — only a DataTransfer's list. */
    const body = new FormData();
    body.set("name", name);
    body.set("image", image.file);

    startTransition(async () => {
      const result = await writeCampaignToken(campaignId, body).catch(
        () => null,
      );

      if (!result || result.kind === "rejected") {
        setError(result?.message ?? "That did not reach the table. Try again.");
        setField(result?.field ?? null);
        setNote(null);
        return;
      }

      setName("");
      setImage(null);
      setError(null);
      setField(null);
      setNote(`${result.token.name} is in your hand.`);
    });
  }

  return (
    <form onSubmit={make} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-5">
        <TokenImageField
          image={image}
          onChange={(picked) => {
            setImage(picked);
            setError(null);
            setNote(null);
          }}
          onBusyChange={setBusy}
          disabled={isPending || full}
          invalid={field === "image"}
        />

        <div className="min-w-56 flex-1">
          <TextField
            label="Name"
            value={name}
            maxLength={MAX_TOKEN_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="Goblin"
            disabled={blocked}
            invalid={field === "name"}
            aria-describedby={FEEDBACK_ID}
          />

          <p className="mt-2 text-xs text-ink/50">
            It joins the palette at the table, under the party. Put it down as
            many times as you need — each copy takes a rim colour of its own.
          </p>
        </div>
      </div>

      <FormAlert id={FEEDBACK_ID}>{error}</FormAlert>
      <FormAlert tone="success">{note}</FormAlert>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={blocked || !image || name.trim().length === 0}
        >
          {isPending ? "Drawing…" : "Create token"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The picture, chosen by dropping one on the disc or pressing it. A round zone
 * because a token IS round on the board — a square preview would promise a crop
 * the map never makes.
 */
function TokenImageField({ image, onChange, onBusyChange, disabled, invalid }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  // Two picks in flight resolve in completion order, not pick order, so without
  // this the slower run wins the preview and the faster one clears `busy` while
  // the other is still working.
  const runId = useRef(0);

  // An object URL holds the whole decoded image for the document's lifetime, so
  // the previous one is revoked on every change.
  useEffect(() => {
    const url = image?.preview;

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [image?.preview]);

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
      const result = await compressToken(file, MAX_TOKEN_IMAGE_BYTES);

      // A newer pick started while this one was encoding; it owns the field.
      if (run !== runId.current) {
        return;
      }

      if (result.decodable === false) {
        reject("That file could not be read as an image.");
        return;
      }

      if (result.file.size > MAX_TOKEN_IMAGE_BYTES) {
        reject(
          `That picture is ${formatBytes(result.file.size)} even after compression, over the ${formatBytes(MAX_TOKEN_IMAGE_BYTES)} limit.`,
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

  // Mutually exclusive, so none can be overridden by the one after it.
  const rim = dragging
    ? "border-gold/70 bg-gold/10"
    : invalid
      ? "border-red-400/60"
      : "border-gold/25 hover:border-gold/55";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        {/* A label wrapping a file input: the input is the control. */}
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);

            if (!disabled) {
              accept(event.dataTransfer.files?.[0]);
            }
          }}
          className={`group relative grid size-20 place-items-center overflow-hidden rounded-full border border-dashed bg-surface/40 transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${rim}`}
          aria-invalid={invalid || undefined}
        >
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept={TOKEN_ACCEPT_ATTRIBUTE}
            disabled={disabled}
            onChange={(event) => accept(event.target.files?.[0])}
            className="sr-only"
          />

          {/* A plain <img>: a picked file is a `blob:` URL the optimiser cannot
              reach. */}
          {image?.preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.preview}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <TokenCameo />
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
            {busy ? "…" : image ? "Change" : "Picture"}
          </span>
        </label>

        {/* Outside the label, or the label's click reaches the input first. */}
        {image && !disabled && (
          <button
            type="button"
            onClick={() => {
              setProblem(null);
              onChange(null);

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            aria-label="Remove the picture"
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
          {image ? formatBytes(image.bytes) : `${AVATAR_EDGE}px WebP`}
        </p>
      )}
    </div>
  );
}

/**
 * The empty disc: a standing figure struck into a coin, which is what a piece on
 * a board is. Deliberately not the character cameo — that one is a PORTRAIT, and
 * what goes here is a monster, a cart or a locked door.
 */
function TokenCameo() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-full text-white"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="currentColor" fillOpacity="0.08" />

      {/* The rim a piece is read by on the board, drawn faint here so the empty
          state already looks like the thing it is waiting for. */}
      <circle
        cx="16"
        cy="16"
        r="11.5"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeDasharray="2.5 2.5"
      />

      <g fill="currentColor" fillOpacity="0.6">
        <circle cx="16" cy="11.6" r="3.1" />
        <path d="M16 15.6c3 0 5.4 2.3 5.6 5.3l.1 1.5H10.3l.1-1.5c.2-3 2.6-5.3 5.6-5.3Z" />
      </g>
    </svg>
  );
}

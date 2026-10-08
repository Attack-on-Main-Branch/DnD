"use client";

import { useState, useTransition } from "react";
import {
  MAX_LOOK_DESCRIPTION_LENGTH,
  MAX_LOOK_IMAGE_BYTES,
} from "sina/rules/member-looks";

import { describeMember, forgetMemberLook } from "@/app/actions/member-looks";
import Button from "@/app/components/ui/button";
import EditModal from "@/app/components/ui/edit-modal";
import { LABEL_CLASSES } from "@/app/components/ui/field-styles";
import FormAlert from "@/app/components/ui/form-alert";
import TextAreaField from "@/app/components/ui/textarea-field";
import { compressReference, REFERENCE_EDGE } from "@/lib/image-compression";

import { TokenImageField } from "./token-form";

/**
 * How a party member looks, for the scene painter: a reference picture and a
 * line about height and build. Seen by the Dungeon Master alone.
 */
export default function MemberLookForm({ campaignId, member, open, onClose }) {
  const look = member.look;

  const [image, setImage] = useState(() =>
    look?.image_url ? { preview: look.image_url } : null,
  );
  const [description, setDescription] = useState(look?.description ?? "");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const blocked = busy || isPending;

  function save(event) {
    event.preventDefault();

    if (blocked) {
      return;
    }

    const body = new FormData();

    body.set("description", description);

    if (image?.file) {
      body.set("image", image.file);
    } else if (!image && look?.image_url) {
      body.set("dropImage", "1");
    }

    startTransition(async () => {
      const result = await describeMember(campaignId, member.id, body).catch(
        () => null,
      );

      if (!result || result.kind === "rejected") {
        setError(
          result?.message ?? "That did not reach the server. Try again.",
        );
        return;
      }

      onClose();
    });
  }

  function forget() {
    startTransition(async () => {
      const result = await forgetMemberLook(campaignId, member.id).catch(
        () => null,
      );

      if (!result || result.kind === "rejected") {
        setError(
          result?.message ?? "That did not reach the server. Try again.",
        );
        return;
      }

      onClose();
    });
  }

  return (
    <EditModal
      open={open}
      title={`How ${member.name} looks`}
      busy={isPending}
      onClose={onClose}
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-wide text-ink">
            How {member.name} looks
          </h3>
          <p className="mt-1 text-sm text-ink/55">
            For the scene painter at the table. Only you see this.
          </p>
        </div>

        <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-1.5">
            <span className={LABEL_CLASSES}>Reference picture</span>

            <TokenImageField
              frame="panel"
              image={image}
              onChange={(picked) => {
                setImage(picked);
                setError(null);
              }}
              onBusyChange={setBusy}
              disabled={isPending}
              compress={compressReference}
              maxBytes={MAX_LOOK_IMAGE_BYTES}
              hint={`${REFERENCE_EDGE}px WebP`}
              empty={<ReferencePrompt />}
            />
          </div>

          <div className="min-w-0 sm:@container">
            <TextAreaField
              label="Description"
              hint={`${description.length} / ${MAX_LOOK_DESCRIPTION_LENGTH}`}
              rows={9}
              className="sm:h-[calc(100cqw*9/32)] sm:resize-none"
              maxLength={MAX_LOOK_DESCRIPTION_LENGTH}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Six foot one, lean, a green travelling cloak over scale mail."
              disabled={isPending}
            />
          </div>
        </div>

        <FormAlert>{error}</FormAlert>

        <div className="flex flex-wrap justify-end gap-3">
          {look && (
            <Button
              variant="ghost"
              onClick={forget}
              disabled={isPending}
              className="mr-auto"
            >
              Clear
            </Button>
          )}

          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>

          <Button type="submit" disabled={blocked}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </EditModal>
  );
}

function ReferencePrompt() {
  return (
    <span className="flex flex-col items-center gap-2 px-4 text-center">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-8 text-gold/50"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9.5" r="1.75" />
        <path d="m3 17 5-5 4 4 3-3 6 6" />
      </svg>

      <span className="text-xs text-ink/55">
        Drop a reference picture here, or click to choose one.
      </span>
    </span>
  );
}

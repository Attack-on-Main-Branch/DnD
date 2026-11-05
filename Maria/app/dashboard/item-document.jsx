"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import EditModal from "@/app/components/ui/edit-modal";
import { itemDocumentSource } from "@/lib/item-document.mjs";

import ItemDocumentPreview from "./item-document-preview";

export default function ItemDocument({ id, name }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(null);
  const shellRef = useRef(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  function close() {
    inFlight.current?.abort();
    setOpen(false);
  }

  async function check() {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setAnswer(null);
    setLoading(true);
    setOpen(true);

    try {
      const response = await fetch(
        `/api/items/document?id=${encodeURIComponent(id)}`,
        {
          signal: controller.signal,
          cache: "no-store",
        },
      );
      const result = await response.json();

      if (controller.signal.aborted) return;
      if (!response.ok) {
        setAnswer({ error: result.message });
        return;
      }

      const fileResponse = result.url
        ? await fetch(result.url, {
            signal: controller.signal,
            cache: "no-store",
            credentials: "omit",
          })
        : null;
      if (fileResponse && !fileResponse.ok)
        throw new Error("Document unavailable");
      const html = fileResponse ? await fileResponse.text() : result.html;
      if (controller.signal.aborted) return;

      const styles = getComputedStyle(shellRef.current);
      setAnswer({
        source: itemDocumentSource(html, {
          color: styles.color,
          background: styles.getPropertyValue("--color-surface"),
          accent: styles.getPropertyValue("--color-gold"),
          fontFamily: styles.fontFamily,
        }),
      });
    } catch {
      if (!controller.signal.aborted) {
        setAnswer({ error: "Could not open that file. Try again." });
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={check} aria-haspopup="dialog">
        Check item
      </Button>
      <EditModal
        open={open}
        title={`Check ${name}`}
        size="preview"
        onClose={close}
        onAfterClose={() => setAnswer(null)}
      >
        <div
          ref={shellRef}
          className="text-ink max-sm:flex max-sm:h-full max-sm:min-h-0 max-sm:flex-col"
        >
          <div className="mb-2 flex items-center justify-between gap-4 max-sm:shrink-0">
            <h3 className="min-w-0 truncate font-display text-lg font-semibold tracking-wide text-gold">
              {name}
            </h3>
            <Button
              variant="ghost"
              aria-label="Close item"
              onClick={close}
              className="size-10 shrink-0 p-0"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-5"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Button>
          </div>
          <ItemDocumentPreview
            name={name}
            source={answer?.source}
            loading={loading}
            error={answer?.error}
            onRetry={check}
          />
        </div>
      </EditModal>
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";

const FAILED = "Could not download party information. Try again.";

export default function PartyExportButton({ campaignId, disabled = false }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  useEffect(() => () => inFlight.current?.abort(), []);

  async function download() {
    if (downloading || disabled) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setDownloading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/party-export`,
        {
          signal: controller.signal,
          cache: "no-store",
        },
      );
      if (response.redirected) {
        setError("Your session has expired. Sign in again.");
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.message ?? FAILED);
        return;
      }
      if (!response.headers.get("Content-Type")?.includes("application/json")) {
        setError(FAILED);
        return;
      }

      const file = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "party-info.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted) setError(FAILED);
    } finally {
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <Button
        variant="secondary"
        onClick={download}
        disabled={disabled || downloading}
        aria-busy={downloading}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" />
        </svg>
        {downloading ? "Downloading…" : "Download party info"}
      </Button>
      <FormAlert>{error}</FormAlert>
    </div>
  );
}

"use client";

import Link from "next/link";

import Button, { buttonClasses } from "@/app/components/ui/button";

/**
 * The dashboard's own boundary, so the segment's shell stays up: the root one
 * replaces everything below the root layout, header and corner grimoire
 * included. `retry` re-fetches, which fixes anything transient — an unmigrated
 * schema fails identically every time, so the link matters as much.
 */
export default function DashboardError({ error, retry }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center font-sans">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-wide">
          That did not load
        </h1>

        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/50">
          {/*
            Development only, same as the root boundary. React replaces the
            message in production with its own paragraph about digests, which is
            documentation rather than something to show a player.
          */}
          {process.env.NODE_ENV === "production"
            ? "Something went wrong on our side, not yours."
            : error?.message || "Something went wrong on our side, not yours."}
        </p>

        {error?.digest && (
          <p className="mt-2 font-mono text-xs text-ink/45">{error.digest}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>

        <Link
          href="/dashboard"
          className={buttonClasses({ variant: "secondary" })}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";

import Button, { buttonClasses } from "./components/ui/button";

/**
 * Route-level error boundary. Must be a Client Component. `global-error.jsx` is
 * a different thing and deliberately absent — it replaces <html> and <body>
 * wholesale, so it only fires when the layout itself failed.
 *
 * `retry` rather than `reset`: `reset` re-renders from what is already in hand,
 * while `retry` re-fetches. Most of what lands here is a Server Component
 * render, where re-rendering the same stale payload cannot help.
 */
export default function Error({ error, retry }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center font-sans">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/50">
          {/*
            Development only. React does scrub the message in production — but
            it substitutes its own three-sentence paragraph about digests and
            omitted messages, which is documentation, not something to show a
            player. It is also never empty, so the `||` fallback below only ever
            fires in development.
          */}
          {process.env.NODE_ENV === "production"
            ? "The page could not be rendered."
            : error?.message || "The page could not be rendered."}
        </p>

        {error?.digest && (
          <p className="mt-2 font-mono text-xs text-ink/45">{error.digest}</p>
        )}
      </div>

      {/*
        Two ways out, not one. `retry` re-fetches, which is the right first
        move for something transient — but for a failure that is not going to
        resolve on its own, a schema that is not there being the obvious case,
        it fails identically every time. This boundary replaces the whole page
        including its header, so without a link there is nowhere to go from
        here but the browser's own back button.
      */}
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

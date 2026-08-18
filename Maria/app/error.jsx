"use client";

import Link from "next/link";

import Button, { buttonClasses } from "./components/ui/button";

/**
 * Route-level error boundary. Must be a Client Component — React needs to
 * attach it as an actual error boundary.
 *
 * It renders inside the root layout, so the animated background is still
 * behind it; without this file Next's default screen would appear instead,
 * with dark text and no awareness of the page it is sitting on.
 *
 * `global-error.jsx` is a different thing and deliberately absent: that one
 * replaces <html> and <body> wholesale, so it only fires when the layout
 * itself failed.
 *
 * `retry` rather than `reset`. Both exist; `retry` went stable in 16.3.0 and
 * is what the docs point at now. The difference is what happens on the way
 * back: `reset` re-renders the boundary's children from what is already in
 * hand, while `retry` re-fetches first. This is the root boundary, so it also
 * catches throws from the client subtrees below it — but most of what lands
 * here is a Server Component render, where re-rendering the same stale payload
 * is the one thing that cannot fix it.
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

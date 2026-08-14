"use client";

import Button from "./components/ui/button";

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
 */
export default function Error({ error, reset }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center font-sans">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/50">
          {/*
            `error.message` is scrubbed to a generic string in production
            builds, so this is safe to show: it is either a development
            message or Next's own placeholder, never a leaked internal.
          */}
          {error?.message || "The page could not be rendered."}
        </p>

        {error?.digest && (
          <p className="mt-2 font-mono text-xs text-ink/45">{error.digest}</p>
        )}
      </div>

      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}

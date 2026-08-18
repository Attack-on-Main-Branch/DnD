import Link from "next/link";

import { buttonClasses } from "./components/ui/button";

export const metadata = {
  title: "Not found",
};

/**
 * Reached by `notFound()` whenever an id does not resolve — which, under RLS,
 * also covers somebody else's character. "Not found" rather than "forbidden" is
 * deliberate: it does not confirm the character exists.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center font-sans">
      <div>
        <p className="font-mono text-sm text-ink/50">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nothing down this path
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/50">
          That page does not exist — or it belongs to somebody else&apos;s
          campaign.
        </p>
      </div>

      <Link href="/dashboard" className={buttonClasses()}>
        Back to dashboard
      </Link>
    </main>
  );
}

import ChangelogEntries from "@/app/components/changelog-entries";
import ChangelogPanel from "@/app/components/changelog-panel";
import SiteHeader from "@/app/components/site-header";
import { currentUser } from "@/lib/supabase";

import NavTransition from "./nav-transition";

/**
 * Everything signed in: the header, the flex column every page fills, and the
 * corner grimoire — the other half of the sign-in transition, carrying the same
 * `<ViewTransition>` name as the big one on the login page.
 *
 * In a layout rather than on each page so it survives navigation instead of
 * being rebuilt, which would restart its drift every time. The flex wrapper
 * came with the header: each page's `<main>` uses `flex-1`.
 *
 * The auth guard deliberately did NOT move here. Layouts do not re-render on
 * navigation, so a check here would not run again between dashboard routes, and
 * a top-level await holds `children` behind it. `user` is read defensively:
 * this renders for a request the page may be about to redirect or throw on.
 */
export default async function DashboardLayout({ children }) {
  const { user } = await currentUser();

  return (
    <>
      {/*
        The entries are rendered here, on the server, and handed to the panel as
        children. This layout is a Server Component, so they never become part
        of the panel's client bundle.
      */}
      <ChangelogPanel>
        <ChangelogEntries />
      </ChangelogPanel>

      {/* The flex column, and every move between these pages — the wordmark
          inside the bar among them. */}
      <NavTransition className="flex flex-1 flex-col">
        <SiteHeader
          displayName={user?.user_metadata?.display_name ?? null}
          email={user?.email}
        />

        {children}
      </NavTransition>
    </>
  );
}

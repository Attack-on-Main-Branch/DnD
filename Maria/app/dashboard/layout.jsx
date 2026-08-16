import ChangelogEntries from "@/app/components/changelog-entries";
import ChangelogPanel from "@/app/components/changelog-panel";
import SiteHeader from "@/app/components/site-header";
import { currentUser } from "@/lib/supabase";

/**
 * Everything signed in: the header, the flex column every page fills, and the
 * grimoire tucked into the bottom-left corner.
 *
 * The corner mark is the other half of the sign-in transition: it carries the
 * same `<ViewTransition>` name as the big one on the login page, so the browser
 * treats them as one object and flies it down here rather than destroying one
 * and creating the other. Here it is also the way into the changelog.
 *
 * In a layout rather than on each page so it survives navigation between the
 * roster, a character sheet and settings: it stays put instead of being torn
 * down and rebuilt, which would restart its drift every time.
 *
 * The header moved here for the same reason plus a duller one — it was written
 * out identically in all three pages, so every new route had to remember it.
 * The flex wrapper came with it: each page's `<main>` uses `flex-1`, and that
 * needs a flex column above it.
 *
 * What deliberately did NOT move is the auth guard. Layouts do not re-render on
 * navigation, so a check here would not run again when the user moves between
 * dashboard routes — and a top-level await in a layout holds `children` behind
 * it. The pages keep their own `redirect`, and `currentUser` is request-scoped
 * so asking here as well costs nothing.
 *
 * `user` is read defensively. This renders for a request the page is about to
 * redirect or throw on, and a header is not worth a second failure.
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

      <div className="flex flex-1 flex-col">
        <SiteHeader
          displayName={user?.user_metadata?.display_name ?? null}
          email={user?.email}
        />

        {children}
      </div>
    </>
  );
}

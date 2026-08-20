import {
  latestAnnouncedVersion,
  listNotifications,
} from "sina/data/notifications";
import { shouldAnnounce } from "sina/rules/notifications";

import ChangelogEntries from "@/app/components/changelog-entries";
import ChangelogPanel from "@/app/components/changelog-panel";
import { CURRENT_RELEASE } from "@/app/components/notifications/version-notice";
import SiteHeader from "@/app/components/site-header";
import { logFailure } from "@/lib/errors";
import { createClient, currentUser } from "@/lib/supabase";

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
 *
 * The inbox is read here, with the header, because the envelope lives in the
 * header and every route under this layout shows it. A layout is not re-run on
 * navigation, which is exactly right for a list kept current by `router.refresh`
 * and `revalidatePath` instead.
 */
export default async function DashboardLayout({ children }) {
  const { user } = await currentUser();
  const inbox = await readInbox(user);

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
          userId={user?.id ?? null}
          notifications={inbox.notifications}
          announce={inbox.announce}
        />

        {children}
      </NavTransition>
    </>
  );
}

/**
 * What is waiting, and whether this release still has to be announced.
 *
 * Two queries rather than one because they ask different questions of the same
 * table: the list hides what has been swept away, and the version check must
 * not — a dismissed announcement is still the record of what its reader has
 * been told. They run together, so it is one round trip's worth of waiting.
 *
 * A failure is logged and swallowed. The header is on every signed-in page, and
 * an inbox that could not be read is no reason to take the page down with it.
 */
async function readInbox(user) {
  if (!user) {
    return { notifications: [], announce: false };
  }

  const supabase = await createClient();
  const [list, seen] = await Promise.all([
    listNotifications(supabase, user.id),
    latestAnnouncedVersion(supabase, user.id),
  ]);

  if (list.error) {
    logFailure("listNotifications", list.error);
  }

  if (seen.error) {
    logFailure("latestAnnouncedVersion", seen.error);
  }

  return {
    notifications: list.error ? [] : list.data,
    // Not announced from here: writing during a render is not something a
    // Server Component should do. The envelope posts it, once, on mount.
    announce: seen.error
      ? false
      : shouldAnnounce(CURRENT_RELEASE.version, seen.data),
  };
}

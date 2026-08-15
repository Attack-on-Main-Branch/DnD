import ChangelogPanel from "@/app/components/changelog-panel";

/**
 * Everything signed in, plus the grimoire tucked into the bottom-left corner.
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
 * Rendered before `children` so the page paints over it — the book sits behind
 * the cards, and a card in front of it takes the click.
 */
export default function DashboardLayout({ children }) {
  return (
    <>
      <ChangelogPanel />

      {children}
    </>
  );
}

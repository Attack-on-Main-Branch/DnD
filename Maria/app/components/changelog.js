/**
 * What has shipped, newest first.
 *
 * Hand-written rather than generated from `git log`, and deliberately so: the
 * build has no git history to read on a deploy host, and a commit subject is
 * written for whoever maintains the code rather than for whoever uses it.
 *
 * KEEP THIS UPDATED WITH EVERY COMMIT — add an entry at the top with the short
 * hash, the date, and what actually changed for someone using the app.
 * `changes` is what is new or different, `fixes` is what was broken and is not
 * any more. Either may be omitted.
 */
export const CHANGELOG = [
  {
    id: "9971bf1",
    date: "2026-08-15",
    title: "The grimoire mark",
    changes: [
      "The grimoire itself is now the app's mark — beside the wordmark in the header, and on the browser tab.",
      "A rebuilt sign-in page: the book and the tale it opens sit on glass beside the card, and fold underneath it on a narrow screen.",
      "Signing in and out carries the book across the screen instead of cutting to the next page. It flies to the dashboard's corner, turning as it goes, and flies back when you leave.",
      "This panel, opened from the book in that corner.",
    ],
  },
  {
    id: "fca6c26",
    date: "2026-08-15",
    title: "Grimoire Tales",
    changes: [
      "The whole app redesigned: ivory and gold on near-black, Cinzel for headings, and liquid glass surfaces throughout.",
      "A two-step class picker — five archetypes, thirteen paths — on the character sheet, shown on the card afterwards.",
      "Character cards carry the artwork for their race, a name you can click to copy the full handle, and a Notes tab on the sheet.",
    ],
    fixes: [
      "Backstory and Personality rejected text at or under 2000 characters. Each paragraph break secretly counted twice, so the real ceiling was 2000 minus the number of them.",
      "Character cards forced themselves wider than their column and overlapped each other at every screen size.",
      "A name made of a single emoji passed the form and then came back as a raw database error.",
      "The password reveal button could not be reached with the keyboard.",
      "Session cookies are no longer readable by scripts on the page.",
      "Two accounts creating characters at the same instant could slip past the three-per-account limit.",
    ],
  },
  {
    id: "abe3312",
    date: "2026-08-13",
    title: "The animated background",
    changes: [
      "A living background of drifting gold paths behind every page.",
      "The app is committed to its dark appearance rather than following the system theme, which was leaving light-mode visitors with near-black text on black.",
      "Proper not-found and error screens instead of the framework's own.",
    ],
    fixes: [
      "Asking for reduced motion and then resizing the window permanently blanked the background's glow and motes.",
      "The still frame drawn for reduced motion ran its whole simulation in one go and froze the page while it did.",
    ],
  },
  {
    id: "e7e974b",
    date: "2026-08-13",
    title: "Race artwork",
    changes: [
      "Character cards show the artwork for their race behind the details.",
    ],
    fixes: [
      "Replacing a race's artwork left everyone looking at the old picture until their browser cache expired.",
      "The play button's light sweep followed the star's spin instead of crossing it.",
    ],
  },
  {
    id: "b26fbe5",
    date: "2026-08-11",
    title: "Settings and character sheets",
    changes: [
      "A settings page for your display name, email address and password.",
      "Each character has a sheet of their own, with tabs and a play button.",
      "The project split into a frontend and a backend that knows nothing about the framework.",
    ],
  },
  {
    id: "6875b91",
    date: "2026-08-10",
    title: "Accounts and characters",
    changes: [
      "Sign up, sign in, and stay signed in.",
      "Create up to three characters, each with a race, an alignment, a colour and a history.",
      "A name and a four-digit tag together make a handle a Dungeon Master can invite.",
    ],
  },
];

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
    id: "2be9d14",
    date: "2026-08-18",
    title: "What a party may see",
    changes: [
      "The full-size map works from the keyboard: tab to it, Enter to zoom in and out, arrow keys to move around while zoomed.",
    ],
    fixes: [
      "Adding a character to a campaign showed the Dungeon Master more of that character than a card does — their backstory and personality among it. A party now sees only what is printed on the card.",
      "A map that was still too large after compression left the form unable to submit and no way to clear it short of reloading the page.",
      "A file that could not be read as an image was accepted as a map and then drawn as a broken picture. It now says so when you choose it.",
      "Removing somebody from a party could report an error at the same moment it worked.",
      "The dashboard was sending every character's whole sheet to the browser, backstory and all, to draw cards that show five things.",
      "The drop zone for a map kept its error outline only until the pointer touched it.",
    ],
  },
  {
    id: "4bea9bb",
    date: "2026-08-18",
    title: "Dungeon Masters and ability scores",
    changes: [
      "Ability scores on the character sheet: fifteen points to spend across the six, from 7 to 15, with the last two points of any score costing double. Your race adds its own on top, and the sheet shows the total and its modifier.",
      "Campaigns, up to three of them. Give one a title, the lore the party already knows, and a world map — the map is scaled and re-encoded in your browser before it is sent, so a 20MB export leaves as about one.",
      "A campaign page with the lore, the map and the party. The map opens full size; click it to zoom in, drag to move around, click again to come back out.",
      "Add characters to a party by searching for a name, an id, or both — fri, 1000 and fri#10 all find the same elf. Six to a party.",
      "A character sheet names the campaigns it plays in, beside the character's name.",
      "The dashboard shows its own slot count for characters and for campaigns, in each section rather than once at the top.",
    ],
    fixes: [
      "Character sheets stopped loading entirely — every tab, for everyone — once campaigns existed. Two security rules each asked the other a question, and the database refused to answer either.",
      "Switching between tabs on a sheet threw away whatever the tab you left was holding. A map you had opened at full size downloaded itself again on the way back.",
      "Choosing a map could make the file larger than the one you picked, and store it at a lower resolution as well.",
    ],
  },
  {
    id: "1c18149",
    date: "2026-08-16",
    title: "Steadier ground",
    fixes: [
      "When the sign-in service could not be reached, the app said your session had expired — so you signed in, got sent back, and signed in again. It now tells you the service is unreachable, and says so instead of asking you to prove who you are.",
      "The loading bar across the top no longer slides for anyone who has asked their system to reduce motion. It still appears while a page is on its way.",
    ],
  },
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

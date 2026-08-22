/**
 * What has shipped, newest first.
 *
 * Hand-written rather than generated from `git log`, and deliberately so: the
 * build has no git history to read on a deploy host, and a commit subject is
 * written for whoever maintains the code rather than for whoever uses it.
 *
 * KEEP THIS UPDATED WITH EVERY RELEASE — add an entry at the top with the
 * version, the date, and what actually changed for someone using the app.
 * `changes` is what is new or different, `fixes` is what was broken and is not
 * any more. Either may be omitted.
 *
 * `version` is the SemVer this release carries, and it must match the three
 * package.json files. A commit that changes nothing a user can observe gets no
 * entry and no number — the ledger records releases, not commits.
 */
export const CHANGELOG = [
  {
    version: "0.10.2",
    date: "2026-08-22",
    title: "What the party carries",
    changes: [
      "The pack above the map has something in it at last. Open it as a player and there is everything your character is carrying, a card each with its count: say how many and use them, drop them, or hand them to somebody across the table.",
      "The Dungeon Master's pack is the whole party's. Pick a name from the row along the top to see what they are carrying and take any of it back, or leave it on the whole party and give the same thing to every one of them at once.",
      "Search the rulebook without leaving the board. Type two letters and the equipment and magic items come back as cards — the name, what kind of thing it is, and what it actually does — and whichever you pick goes into the pack you aimed at.",
      "An Items tab on the campaign page, for everything the rulebook has never heard of. Write down a rusted key or a bag of rats once and it is there in the table's search from then on, ahead of the rulebook's own.",
      "Handing something over is one movement rather than two. It leaves your pack and arrives in theirs together, so nothing can be lost in between — and a Dungeon Master can move loot around their own party the same way.",
      "Loot arrives as it is handed out. A Dungeon Master giving the party torches puts one in every pack on every screen, and nobody reloads anything.",
      "Using something writes itself into your notes — “Used Potion of Healing” — so the session keeps its own ledger of what was spent.",
      "Use, drop and give all ask first, with the number in the question, and the answer that does the thing sits on the right of it every time.",
      "The same items are read back under Inventory on the character sheet, where nothing can be spent. What a party is carrying is settled at the table, in front of whoever is running it.",
    ],
  },
  {
    version: "0.10.1",
    date: "2026-08-22",
    title: "One roll, every screen",
    changes: [
      "Dice down the rail beside the board, d4 through d100. Press one and it is thrown onto the map: it tumbles across the world, comes to rest on a face, and the number slides out from under your card.",
      "Everybody at the table watches the same throw. Not a picture of it and not a number arriving afterwards — the same dice, the same tumble, the same face, on every screen at once.",
      "The Dungeon Master can draw a veil over the rail. The boards turn violet for the whole table while a kept roll is in the air, so everyone knows something is being rolled and nobody but the roller learns what came up.",
      "Ask for stillness in your system settings and the dice are not thrown at all — the number simply arrives.",
    ],
    fixes: [
      "Hit points somebody else changed never changed on your screen. A Dungeon Master could take half a party's health off and every player would keep looking at full bars until they reloaded the page.",
      "Tokens put on the map took a couple of seconds to reach anybody else. They arrive as they are put down now, which is what this app has been claiming since the table opened.",
      "Leaving the table left your card lit in everybody else's party rail for several seconds after you had gone. You stand up as you go now.",
      "Somebody who accepted an invitation while you were already at the table never appeared in your party until you reloaded. They arrive as they sit down.",
      "The party rail went dark and relit itself whenever the connection so much as blinked, which read as the whole party standing up and sitting back down.",
    ],
  },
  {
    version: "0.10.0",
    date: "2026-08-21",
    title: "A seat at the table",
    changes: [
      "The gold star opens the table now: the campaign's board, with the world in the middle and the party down the side. Pressing it on a character's sheet seats you as that character; pressing it on a campaign's page seats you at the head of the table.",
      "The map is the board. Click to zoom in on it, drag or use the arrow keys to travel across it, and click again to come back out.",
      "Right-click the map to put your token down, and right-click the token to lift it again. A player marks with their character's own face, the Dungeon Master with the party's gold token — and may clear anybody's.",
      "Marks arrive as they are made. Everybody at the table is looking at the same board, without anyone reloading it.",
      "The party sits down the right, a card each with its level in a ring, and a card lights gold for as long as its player has the table open.",
      "Hit points are kept now rather than drawn at full on every visit, so the bar on a character's sheet shows what they actually have left.",
      "Health runs along the bottom of the board: a player watches their own, the Dungeon Master watches the whole party's and holds the pen over all of it. Type an amount and give it or take it — seven damage, four healed — rather than working out anybody's new total.",
      "A scroll above the map for writing notes while you play. A player's are read back under Notes on their character sheet; a Dungeon Master keeps their own book, on a new Notes tab on the campaign page. Beside it a globe, for reading the world's lore without leaving the board, and a pack, which stays empty until loot exists.",
      "The table arrives rather than appears: the campaign's name converges out of wide-spaced letters, the map grows into the middle, its frame blooms around it, and the party falls in down the rail. The grimoire in the corner stands down for as long as you are playing.",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-08-21",
    title: "A knock at the seal",
    changes: [
      "The envelope in the bar answers when something lands in it: it grows, rocks itself still, and settles back down.",
      "The ruby pip waits for that to finish before dropping onto the seal, rather than lighting up beside it. It plays again each time something new arrives.",
    ],
    fixes: [
      "The unread pip sat in the air above the envelope instead of on its corner.",
      "The envelope was the one control in the bar that did not light up under the pointer.",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-08-20",
    title: "Sealed missives",
    changes: [
      "A wax-sealed envelope in the bar across the top, and everything waiting for you behind it. A ruby pip glows on the seal while something is unanswered.",
      "Dungeon Masters now invite a character rather than adding one. The player finds the invitation in their own keeping and answers it — accepting puts their character in the party, declining says no, and the Dungeon Master's party list fills in the moment they do.",
      "Nobody's character can be enlisted without their say-so any more. Being findable by your handle is an invitation to be asked, not a way to be signed up.",
      "A note arrives whenever the app has been updated, with a way straight into this grimoire from it.",
      "Invitations and party changes arrive on their own. No reloading the page to find out whether anybody answered.",
      "The missives panel unfolds downwards out of the seal and folds back up into it, and sits centred under the envelope that opens it.",
    ],
  },
  {
    version: "0.8.1",
    date: "2026-08-20",
    title: "Doors on every room",
    changes: [
      "Every page opens and closes now rather than cutting. Sheets, the creation panel, settings and the sign-in card unfold out of a line of light; the dashboard's cards glide in from the sides and slide back out the way they came.",
      "The bar across the top drops into place when a page is opened fresh, and leaves over the top when you sign out. Moving between the signed-in pages leaves it where it is.",
      "The settings page is one panel rather than three stacked cards, and the sign-in page types its own name out.",
    ],
    fixes: [
      "Panels flashed at full size for an instant before folding open.",
      "Opening the full-size map stuttered the first time, while the picture was still arriving. It is now fetched the moment you reach for the preview.",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-08-19",
    title: "Hit points, and doors that open",
    changes: [
      "A health bar on the character sheet, reading gold while a character is holding up, amber once they are bloodied, and red with a heartbeat under it near the end.",
      "Character sheets, campaign pages and the creation panel now open: a line of light that unfolds into the card, and then the contents arrive.",
      "Switching between tabs on a sheet fades the panels instead of cutting, and the card grows or shrinks to fit the one you picked rather than jumping.",
      "The sign-in card grows and shrinks between signing in and creating an account, and the new fields slide in rather than appearing.",
      "The full-size map grows out of its preview and folds back into it, and can be worked from the keyboard throughout.",
    ],
    fixes: [
      "The full-size map showed black bars down both sides that the preview does not, and snapped back to the preview's framing at the end of closing.",
      "Opening the changelog darkened the room in one step while the panel was still sliding in. The two now travel together.",
      "The dashboard flickered on the way to and from the creation panel, and the empty slots came back with their glass broken.",
      "Tab panels no longer add their hidden height to the page, which was putting a scrollbar on tabs that had nothing to scroll.",
    ],
  },
  {
    version: "0.7.1",
    date: "2026-08-18",
    title: "What a party may see",
    fixes: [
      "The full-size map could not be worked from the keyboard at all, while telling anyone using one to drag it. Tab reaches it now, Enter zooms, and the arrow keys move around while zoomed.",
      "Adding a character to a campaign showed the Dungeon Master more of that character than a card does — their backstory and personality among it. A party now sees only what is printed on the card.",
      "A map that was still too large after compression left the form unable to submit and no way to clear it short of reloading the page.",
      "A file that could not be read as an image was accepted as a map and then drawn as a broken picture. It now says so when you choose it.",
      "Removing somebody from a party could report an error at the same moment it worked.",
      "The dashboard was sending every character's whole sheet to the browser, backstory and all, to draw cards that show five things.",
      "The drop zone for a map kept its error outline only until the pointer touched it.",
    ],
  },
  {
    version: "0.7.0",
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
    version: "0.6.1",
    date: "2026-08-16",
    title: "Steadier ground",
    fixes: [
      "When the sign-in service could not be reached, the app said your session had expired — so you signed in, got sent back, and signed in again. It now tells you the service is unreachable, and says so instead of asking you to prove who you are.",
      "The loading bar across the top no longer slides for anyone who has asked their system to reduce motion. It still appears while a page is on its way.",
    ],
  },
  {
    version: "0.6.0",
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
    version: "0.5.0",
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
    version: "0.4.0",
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
    version: "0.3.0",
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
    version: "0.2.0",
    date: "2026-08-11",
    title: "Settings and character sheets",
    changes: [
      "A settings page for your display name, email address and password.",
      "Each character has a sheet of their own, with tabs and a play button.",
      "The project split into a frontend and a backend that knows nothing about the framework.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-10",
    title: "Accounts and characters",
    changes: [
      "Sign up, sign in, and stay signed in.",
      "Create up to three characters, each with a race, an alignment, a colour and a history.",
      "A name and a four-digit tag together make a handle a Dungeon Master can invite.",
    ],
  },
];

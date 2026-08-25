"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { MAX_ACTIVITY_ENTRIES } from "sina/rules/activity";
import { readContainers } from "sina/rules/containers";
import { COIN_TYPES, readPurse } from "sina/rules/currency";
import { MAX_ITEM_QUANTITY } from "sina/rules/inventory";

/**
 * Everything at this table that a press can move, held in the browser.
 *
 * Every deed here used to be answered by re-rendering the route — ten Supabase
 * queries and a render of the whole board to move one integer the browser
 * already knew the new value of, several times over on a busy table. So the
 * numbers live here instead: a press paints at once and the write follows.
 *
 * THE SERVER IS STILL THE AUTHOR. page.jsx renders the seed, and a real
 * `router.refresh()` — a party that changed, a tab coming back, a socket that
 * dropped — replaces the whole of it.
 *
 * WHAT MAY BE BELIEVED, unchanged from table-wire.jsx: a value off the socket
 * has not been through a `select()` list, so it goes through the same
 * `sina/rules/*` that bound the sender's own write, and an id off the wire only
 * picks out a row this browser already has. Nothing here takes a NAME off the
 * wire — the log is re-read from the database rather than rendered from what
 * somebody said. See 20260823090000_campaign_activity_log.sql.
 *
 * ONE VALUE PER SUBSCRIBER, which is what makes a hit point cost one card's
 * render. That is a promise about the selectors: every one below returns a
 * primitive or a slice this store keeps referentially stable, because a selector
 * building a fresh object each call would spin React forever.
 */

const StoreContext = createContext(null);

/* --------------------------------------------------------------------------
 * The store itself. Plain JavaScript, no React.
 * ----------------------------------------------------------------------- */

/** A row list per character, with an empty list for anybody carrying nothing. */
function byCharacter(members, rows) {
  const grouped = {};

  for (const member of members) {
    grouped[member.id] = [];
  }

  for (const row of rows ?? []) {
    grouped[row.character_id]?.push(row);
  }

  return grouped;
}

/** The same for a re-read covering only some characters; the rest keep theirs. */
function regroup(grouped, ids, rows) {
  const next = { ...grouped };

  for (const id of ids) {
    if (id in next) {
      next[id] = [];
    }
  }

  for (const row of rows ?? []) {
    // Only into a slot this pass emptied: pushing into one it came from would
    // mutate an array another render is still holding.
    if (ids.includes(row.character_id) && row.character_id in next) {
      next[row.character_id].push(row);
    }
  }

  return next;
}

/**
 * What is in each container NOBODY is carrying. A carried bag has no rows here:
 * its contents are that character's pack rows under the bag's id.
 */
function byContainer(rows) {
  const grouped = {};

  for (const row of rows ?? []) {
    (grouped[row.container_id] ??= []).push(row);
  }

  return grouped;
}

/**
 * Where every token stands, by the seat that owns it. A Map, because `null` is a
 * real key here — the head of the table's own chair.
 */
function readMarks(rows) {
  return new Map(
    (rows ?? []).map((mark) => [mark.character_id, { x: mark.x, y: mark.y }]),
  );
}

/**
 * The seed, as the store holds it. Levels and health are separate slices so that
 * an award does not re-render everything watching a hit point.
 */
function readSeed({
  members,
  activity,
  marks,
  inventory,
  spells,
  purses,
  casters,
  containers,
  containerItems,
}) {
  const levels = {};
  const health = {};
  const wallets = {};
  const slots = {};

  for (const member of members) {
    levels[member.id] = member.level;
    health[member.id] = { current: member.current_hp, max: member.max_hp };
  }

  for (const row of purses ?? []) {
    wallets[row.character_id] = readPurse(row);
  }

  for (const [characterId, caster] of Object.entries(casters ?? {})) {
    slots[characterId] = caster.slots ?? {};
  }

  return {
    levels,
    health,
    log: readLog(activity ?? [], new Map(), new Set()),
    marks: readMarks(marks),
    packs: byCharacter(members, inventory),
    books: byCharacter(members, spells),
    purses: wallets,
    slots,
    /* Read through the rules layer: two shapes live in one table. */
    containers: readContainers(containers),
    chests: byContainer(containerItems),
  };
}

/**
 * The log as the panel reads it: what this browser has put up and is waiting on,
 * then the rows the database holds. `shown` is built here rather than in a
 * selector, which would hand `useSyncExternalStore` a fresh array every call.
 *
 * `settled` is the ids of rows standing in for a line already drawn — the same
 * event, so they must not glide in twice. A set carried forward rather than a
 * count, or the next thing that happens re-plays every arrival on screen.
 */
function readLog(server, pending, settled) {
  const waiting = [];

  // A Map iterates in insertion order, so the last thing pressed comes last.
  for (const entries of [...pending.values()].reverse()) {
    waiting.push(...entries);
  }

  const kept = new Set();
  const rows = server.map((entry) => {
    if (!settled.has(entry.id)) {
      return entry;
    }

    kept.add(entry.id);
    return { ...entry, settled: true };
  });

  return {
    server,
    pending,
    settled: kept,
    shown: [...waiting, ...rows].slice(0, MAX_ACTIVITY_ENTRIES),
  };
}

/** The rows a batch of pending lines just became: the newest `count` of them. */
function alsoSettled(settled, server, count) {
  const marked = new Set(settled);

  for (const entry of server.slice(0, count)) {
    marked.add(entry.id);
  }

  return marked;
}

function createTableStore(seed) {
  let state = readSeed(seed);
  const listeners = new Set();

  /** Ephemeral ids for what the log shows before the database has a row. */
  let drawn = 0;

  function commit(next) {
    state = next;

    for (const listener of listeners) {
      listener();
    }
  }

  /** One character's slot of one slice, leaving every other slot's reference. */
  function amend(slice, characterId, value) {
    commit({ ...state, [slice]: { ...state[slice], [characterId]: value } });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },

    read() {
      return state;
    },

    /**
     * A CHANGE and not a total: a total is computed against a number that may
     * have moved since the press, so two quick presses would both aim at the
     * same figure instead of stacking. Null is a press that did nothing.
     */
    moveHealth(characterId, delta) {
      const bar = state.health[characterId];

      if (!bar) {
        return null;
      }

      const next = Math.min(bar.max, Math.max(0, bar.current + delta));

      if (next === bar.current) {
        return null;
      }

      amend("health", characterId, { ...bar, current: next });

      // What the bar ACTUALLY moved by: ten damage against seven hit points is
      // a change of seven.
      return { hitPoints: next, moved: next - bar.current };
    },

    /**
     * The number the database settled on, laid over the one a press painted —
     * and only while that is still what the bar reads.
     *
     * Answers come back in the order the presses were queued, so the first
     * describes a bar that has already moved again; laying it down would rewind
     * the bar and broadcast the rewind as truth. `false` is "somebody has moved
     * on", and the caller uses it to hold its tongue on the wire.
     */
    reconcileHealth(characterId, expected, actual) {
      const bar = state.health[characterId];

      if (!bar || bar.current !== expected) {
        return false;
      }

      if (actual !== bar.current) {
        amend("health", characterId, { ...bar, current: actual });
      }

      return true;
    },

    /** The same, for the ring. */
    reconcileLevel(characterId, expected, actual) {
      if (state.levels[characterId] !== expected) {
        return false;
      }

      if (actual !== expected) {
        amend("levels", characterId, actual);
      }

      return true;
    },

    /** A number heard from another chair, clamped by this character's ceiling. */
    setHealth(characterId, hitPoints) {
      const bar = state.health[characterId];

      if (!bar || hitPoints === null || hitPoints === bar.current) {
        return;
      }

      amend("health", characterId, {
        ...bar,
        current: Math.min(bar.max, Math.max(0, hitPoints)),
      });
    },

    setLevel(characterId, level) {
      if (
        !(characterId in state.levels) ||
        level === null ||
        level === state.levels[characterId]
      ) {
        return;
      }

      amend("levels", characterId, level);
    },

    /* ---------------------------------------------------------------------
     * The log.
     * ------------------------------------------------------------------ */

    /**
     * Lines put up before the database has written them, returning the TICKET
     * that settles them. One deed can be several lines — the Dungeon Master
     * paying the party in three denominations — and two deeds can be in the air
     * at once, answering in either order.
     */
    noteEntries(entries) {
      const ticket = ++drawn;

      const shown = entries.map((entry, index) => ({
        ...entry,
        id: `pending:${ticket}:${index}`,
        pending: true,
      }));

      const pending = new Map(state.log.pending).set(ticket, shown);

      commit({
        ...state,
        log: readLog(state.log.server, pending, state.log.settled),
      });

      return ticket;
    },

    /** The list as the database has it, and the batch it accounts for. */
    setActivity(entries, ticket = null) {
      const held = ticket === null ? null : state.log.pending.get(ticket);

      if (!entries && !held) {
        return;
      }

      const pending = new Map(state.log.pending);

      if (held) {
        pending.delete(ticket);
      }

      const server = entries ?? state.log.server;

      commit({
        ...state,
        log: readLog(
          server,
          pending,
          entries && held
            ? alsoSettled(state.log.settled, server, held.length)
            : state.log.settled,
        ),
      });
    },

    /** A batch whose deed was refused. The lines come down, nothing replaces them. */
    dropEntries(ticket) {
      if (ticket === null || !state.log.pending.has(ticket)) {
        return;
      }

      const pending = new Map(state.log.pending);
      pending.delete(ticket);

      commit({
        ...state,
        log: readLog(state.log.server, pending, state.log.settled),
      });
    },

    /* ---------------------------------------------------------------------
     * The board.
     * ------------------------------------------------------------------ */

    /**
     * A token put down, moved, or lifted — `null` for the last of those. A seat
     * has one mark, so placing and moving are the same line. Whether it may be
     * DRAWN is use-table-marks.js's question, out of the faces the server sent.
     */
    setMark(characterId, point) {
      const marks = new Map(state.marks);

      if (point) {
        marks.set(characterId, point);
      } else if (!marks.delete(characterId)) {
        return;
      }

      commit({ ...state, marks });
    },

    /* ---------------------------------------------------------------------
     * Packs.
     * ------------------------------------------------------------------ */

    /**
     * A stack going up or down in one pack. `item` is what the drawer has on
     * screen, so a grant of something nobody was carrying draws a row for it
     * with an ephemeral id — the real one is generated in the database.
     *
     * `containerId` is WHICH BAG of theirs, null being the pack. It is part of
     * the key: a stack is `(character, slug, container)`, so matching on the
     * slug alone would spend the wrong rope.
     */
    movePack(characterId, item, delta, containerId = null) {
      const pack = state.packs[characterId];

      if (!pack || !delta) {
        return;
      }

      const here = (row) =>
        row.item_slug === item.slug &&
        (row.container_id ?? null) === containerId;

      const held = pack.find(here);

      if (!held) {
        if (delta < 0) {
          return;
        }

        amend("packs", characterId, [
          ...pack,
          {
            id: `pending:${++drawn}`,
            character_id: characterId,
            container_id: containerId,
            item_slug: item.slug,
            name: item.name,
            category: item.category ?? "Equipment",
            description: item.description ?? "",
            quantity: Math.min(MAX_ITEM_QUANTITY, delta),
            is_custom: Boolean(item.isCustom),
            facts: item.facts ?? {},
            created_at: null,
          },
        ]);

        return;
      }

      const quantity = Math.min(
        MAX_ITEM_QUANTITY,
        Math.max(0, held.quantity + delta),
      );

      amend(
        "packs",
        characterId,
        quantity === 0
          ? pack.filter((row) => !here(row))
          : pack.map((row) => (here(row) ? { ...row, quantity } : row)),
      );
    },

    /* ---------------------------------------------------------------------
     * Containers.
     * ------------------------------------------------------------------ */

    /**
     * A chest opened to the table, or shut again. The audience is kept when it
     * is shut, as `hide_chest` keeps it.
     */
    showContainer(containerId, visibleTo) {
      const shelf = state.containers;

      if (!shelf.some((one) => one.id === containerId)) {
        return;
      }

      commit({
        ...state,
        containers: shelf.map((one) =>
          one.id === containerId
            ? {
                ...one,
                isRevealed: Boolean(visibleTo),
                visibleTo: visibleTo ?? one.visibleTo,
              }
            : one,
        ),
      });
    },

    /** `movePack` for a chest, ephemeral id and all. */
    moveChest(containerId, item, delta) {
      if (!delta) {
        return;
      }

      const rows = state.chests[containerId] ?? [];
      const held = rows.find((row) => row.item_slug === item.slug);

      if (!held) {
        if (delta < 0) {
          return;
        }

        amend("chests", containerId, [
          ...rows,
          {
            id: `pending:${++drawn}`,
            container_id: containerId,
            item_slug: item.slug,
            name: item.name,
            category: item.category ?? "Equipment",
            description: item.description ?? "",
            quantity: Math.min(MAX_ITEM_QUANTITY, delta),
            is_custom: Boolean(item.isCustom),
            facts: item.facts ?? {},
            created_at: null,
          },
        ]);

        return;
      }

      const quantity = Math.min(
        MAX_ITEM_QUANTITY,
        Math.max(0, held.quantity + delta),
      );

      amend(
        "chests",
        containerId,
        quantity === 0
          ? rows.filter((row) => row.item_slug !== item.slug)
          : rows.map((row) =>
              row.item_slug === item.slug ? { ...row, quantity } : row,
            ),
      );
    },

    /**
     * A whole bag changing hands: the card says who carries it and the pack
     * drawer draws what is inside it, so a frame in which those disagree shows
     * a bag in one player's hands whose contents are still in another's.
     *
     * The rows come from both homes at once — the old owner's pack, and
     * `container_items` for a bag nobody had picked up yet — because
     * `transfer_container` drains both. The two shapes are the same columns.
     */
    passContainer(containerId, from, to) {
      const shelf = state.containers;

      if (!to || from === to || !shelf.some((one) => one.id === containerId)) {
        return;
      }

      const packs = { ...state.packs };
      const chests = { ...state.chests };

      const moving = [
        ...(packs[from] ?? []).filter(
          (row) => row.container_id === containerId,
        ),
        ...(chests[containerId] ?? []),
      ];

      if (from && from in packs) {
        packs[from] = packs[from].filter(
          (row) => row.container_id !== containerId,
        );
      }

      if (to in packs) {
        packs[to] = [
          ...packs[to],
          ...moving.map((row) => ({
            ...row,
            character_id: to,
            container_id: containerId,
          })),
        ];
      }

      chests[containerId] = [];

      commit({
        ...state,
        packs,
        chests,
        containers: shelf.map((one) =>
          one.id === containerId ? { ...one, ownerCharacterId: to } : one,
        ),
      });
    },

    /* ---------------------------------------------------------------------
     * Purses.
     * ------------------------------------------------------------------ */

    /** One denomination, up or down. Never a balance — see currency-actions.js. */
    movePurse(characterId, coin, delta) {
      const purse = state.purses[characterId];

      if (!purse || !COIN_TYPES.includes(coin) || !delta) {
        return;
      }

      amend("purses", characterId, {
        ...purse,
        [coin]: Math.max(0, purse[coin] + delta),
      });
    },

    /** Every denomination at once: the Dungeon Master's Grant and Take. */
    movePurseBy(characterId, coins, sign) {
      const purse = state.purses[characterId];

      if (!purse) {
        return;
      }

      const next = { ...purse };

      for (const coin of COIN_TYPES) {
        next[coin] = Math.max(0, next[coin] + sign * (coins[coin] ?? 0));
      }

      amend("purses", characterId, next);
    },

    /* ---------------------------------------------------------------------
     * Books and slots.
     * ------------------------------------------------------------------ */

    /**
     * A slot spent (`by` above zero) or given back. The column counts what has
     * been USED; the maximum is derived from the class and the level, so nothing
     * here has to know it — `consume_spell_slot` refuses going past it.
     */
    moveSlot(characterId, slotLevel, by) {
      const slots = state.slots[characterId];

      if (!slots || !by) {
        return;
      }

      const held = slots[slotLevel];
      const used = Math.max(0, Number(held?.used ?? 0) + by);

      amend("slots", characterId, {
        ...slots,
        [slotLevel]: { ...(held ?? {}), used },
      });
    },

    /** Struck out of one book. Learning waits for the row the database made. */
    forgetSpell(characterId, slug) {
      const book = state.books[characterId];

      if (!book) {
        return;
      }

      amend(
        "books",
        characterId,
        book.filter((row) => row.spell_slug !== slug),
      );
    },

    /* ---------------------------------------------------------------------
     * Reconciling.
     * ------------------------------------------------------------------ */

    /**
     * Slices re-read through `readTableSlice`, which is what a refusal is
     * answered with: rather than unpicking a change that may have been stacked
     * on since, the store asks what is actually there. Only the slices that came
     * back are replaced, and only for characters this browser already has.
     */
    sync(slices) {
      if (!slices) {
        return;
      }

      let next = state;

      if (slices.activity) {
        next = {
          ...next,
          log: readLog(slices.activity, next.log.pending, next.log.settled),
        };
      }

      // The whole board, because a row list is also how an absence arrives: a
      // token lifted is a row that is no longer in it.
      if (slices.marks) {
        next = { ...next, marks: readMarks(slices.marks) };
      }

      if (slices.party) {
        const levels = { ...next.levels };
        const health = { ...next.health };

        for (const member of slices.party) {
          if (member.id in levels) {
            levels[member.id] = member.level;
            health[member.id] = {
              current: member.current_hp,
              max: member.max_hp,
            };
          }
        }

        next = { ...next, levels, health };
      }

      // Scoped to the characters the answer speaks for: a row list cannot carry
      // the fact that a pack is empty, so a wider replace would blank the rest.
      const covered = slices.characterIds ?? [];

      if (slices.inventory && covered.length > 0) {
        next = {
          ...next,
          packs: regroup(next.packs, covered, slices.inventory),
        };
      }

      if (slices.spells && covered.length > 0) {
        next = { ...next, books: regroup(next.books, covered, slices.spells) };
      }

      if (slices.purses) {
        const purses = { ...next.purses };

        for (const row of slices.purses) {
          purses[row.character_id] = readPurse(row);
        }

        next = { ...next, purses };
      }

      // The whole shelf: a row list is also how an absence arrives.
      if (slices.containers) {
        next = { ...next, containers: readContainers(slices.containers) };
      }

      if (slices.containerItems) {
        next = { ...next, chests: byContainer(slices.containerItems) };
      }

      if (slices.sheets) {
        const slots = { ...next.slots };

        for (const sheet of slices.sheets) {
          slots[sheet.id] = sheet.spell_slots ?? {};
        }

        next = { ...next, slots };
      }

      commit(next);
    },

    /** The whole board again, from a route render. The server wins here. */
    reseed(seed) {
      commit(readSeed(seed));
    },
  };
}

/* --------------------------------------------------------------------------
 * The provider, and one hook per thing worth re-rendering for.
 * ----------------------------------------------------------------------- */

export default function TableState({ seed, children }) {
  const [store] = useState(() => createTableStore(seed));

  /* page.jsx is a Server Component, so the seed's identity changing IS a route
     render having landed — which is when the server's numbers should replace
     ours. After paint rather than during render: writing to an external store
     while rendering can tear. */
  const adopted = useRef(seed);

  useEffect(() => {
    if (adopted.current === seed) {
      return;
    }

    adopted.current = seed;
    store.reseed(seed);
  }, [seed, store]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useTableStore() {
  const store = useContext(StoreContext);

  if (!store) {
    throw new Error("useTableStore was called outside TableState");
  }

  return store;
}

/**
 * One value out of the store, and a render only when that value changes.
 *
 * `select` must be stable and must return something the store keeps stable:
 * `useSyncExternalStore` calls the reader during render, so a fresh closure
 * resubscribes every render and a fresh object loops. Hence the `useCallback`
 * on every hook below, and the module-level selectors under them.
 */
function useTableValue(select) {
  const store = useTableStore();
  const read = useCallback(() => select(store.read()), [select, store]);

  return useSyncExternalStore(store.subscribe, read, read);
}

export function useHitPoints(characterId) {
  return useTableValue(
    useCallback(
      (state) => state.health[characterId]?.current ?? 0,
      [characterId],
    ),
  );
}

export function useMaxHitPoints(characterId) {
  return useTableValue(
    useCallback((state) => state.health[characterId]?.max ?? 0, [characterId]),
  );
}

export function useCharacterLevel(characterId) {
  return useTableValue(
    useCallback((state) => state.levels[characterId] ?? 1, [characterId]),
  );
}

/**
 * Every level at once, for the spellbook: how many slots a caster has is derived
 * from their class and their level, so an award at the rail moves the bar at the
 * foot of the book.
 */
export function useAllLevels() {
  return useTableValue(selectLevels);
}

export function useActivityEntries() {
  return useTableValue(selectActivity);
}

export function useMarkPoints() {
  return useTableValue(selectMarks);
}

/**
 * The whole party's, for the pieces that show all of it — where a per-character
 * hook cannot be called in a loop, and re-rendering when any one moves is right.
 */
export function useAllPacks() {
  return useTableValue(selectPacks);
}

export function useAllPurses() {
  return useTableValue(selectPurses);
}

export function useAllBooks() {
  return useTableValue(selectBooks);
}

export function useAllSlots() {
  return useTableValue(selectSlots);
}

/** Every bag and chest this viewer was handed. RLS has already narrowed it. */
export function useContainers() {
  return useTableValue(selectContainers);
}

/** And what is in the ones nobody is carrying, by container. */
export function useChestItems() {
  return useTableValue(selectChests);
}

const selectActivity = (state) => state.log.shown;
const selectMarks = (state) => state.marks;
const selectLevels = (state) => state.levels;
const selectPacks = (state) => state.packs;
const selectPurses = (state) => state.purses;
const selectBooks = (state) => state.books;
const selectSlots = (state) => state.slots;
const selectContainers = (state) => state.containers;
const selectChests = (state) => state.chests;

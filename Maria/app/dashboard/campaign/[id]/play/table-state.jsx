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

import { markKey } from "sina/rules/campaign";
import { MAX_ACTIVITY_ENTRIES } from "sina/rules/activity";
import { readContainers } from "sina/rules/containers";
import { COIN_TYPES, readPurse } from "sina/rules/currency";
import { parseArmorClass, readDeathSaves } from "sina/rules/death";
import { readConditions } from "sina/rules/conditions";
import { readFeatures } from "sina/rules/features";
import { parseInspiration, steppedInspiration } from "sina/rules/inspiration";
import { MAX_ITEM_QUANTITY } from "sina/rules/inventory";
import { steppedXp } from "sina/rules/xp";

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
    (rows ?? []).map((mark) => [
      // A seat has a token on every map it has stood on, so the seat alone is
      // no longer the key — see `markKey`, which the unique index in
      // 20260921090000 spells out the same way.
      markKey(mark.map_id, mark.character_id),
      {
        characterId: mark.character_id,
        mapId: mark.map_id ?? null,
        x: mark.x,
        y: mark.y,
        q: mark.hex_q,
        r: mark.hex_r,
      },
    ]),
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
  vitals,
  features,
}) {
  const levels = {};
  const experience = {};
  const inspired = {};
  const health = {};
  const shields = {};
  const saves = {};
  const gone = {};
  const dice = {};
  const suffering = {};
  const wallets = {};
  const slots = {};

  for (const member of members) {
    levels[member.id] = member.level;
    experience[member.id] = member.xp ?? 0;
    /* Null where this viewer may not read them — `campaign_party` answers with
       one for anybody but their own, so the card draws no pips at all. */
    inspired[member.id] = parseInspiration(member.inspiration);
    health[member.id] = { current: member.current_hp, max: member.max_hp };
    /* Null the same way, and for the same reason: an armour class is the head
       of the table's to read across the party and a player's for their own. */
    shields[member.id] = parseArmorClass(member.armor_class);
    /* Never null. A character lying at zero in front of the party is the most
       public thing that can happen at a table. */
    saves[member.id] = readDeathSaves(member.death_saves);
    gone[member.id] = Boolean(member.is_dead);
    /* Read through the rules layer, which drops what it does not know and puts
       the rest in the catalogue's own order — see readConditions. */
    suffering[member.id] = readConditions(member.conditions);
  }

  for (const row of purses ?? []) {
    wallets[row.character_id] = readPurse(row);
  }

  for (const [characterId, caster] of Object.entries(casters ?? {})) {
    slots[characterId] = caster.slots ?? {};
  }

  /* The tally a short rest spends, for whichever sheets this viewer was handed.
     Everything else the vitals ribbon prints is derived from a row that only a
     route render can change, so only this one is held here. */
  for (const [characterId, sheet] of Object.entries(vitals ?? {})) {
    dice[characterId] = sheet.hitDiceSpent ?? 0;
  }

  return {
    levels,
    xp: experience,
    inspiration: inspired,
    health,
    armor: shields,
    saves,
    dead: gone,
    hitDice: dice,
    conditions: suffering,
    /* One list per character the viewer was handed a sheet for. Read through
       the rules layer, which drops anything that does not hold together. */
    features: byCharacter(
      Object.keys(vitals ?? {}).map((id) => ({ id })),
      readFeatures(features).map((one) => ({
        ...one,
        character_id: one.characterId,
      })),
    ),
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

    /**
     * THE FRAME AND THE BAR TOGETHER, which is what a level moving does to them:
     * laid down one at a time, the bar would draw past its own track for a frame.
     */
    setFrame(characterId, maxHp, hitPoints) {
      const bar = state.health[characterId];

      if (!bar || maxHp === null || hitPoints === null) {
        return;
      }

      if (bar.max === maxHp && bar.current === hitPoints) {
        return;
      }

      amend("health", characterId, {
        max: maxHp,
        current: Math.min(maxHp, Math.max(0, hitPoints)),
      });
    },

    /**
     * EVERYTHING ZERO HIT POINTS DECIDES, laid down together. The bar, the flag
     * and the two tallies are one fact — `apply_damage` and `roll_death_save`
     * each write all three in one statement — and putting them down one at a
     * time draws a frame of a character who is dead with saves still standing.
     *
     * Every field is optional: a press that only moved the bar leaves the rest
     * where they are.
     */
    setCondition(characterId, { hitPoints, isDead, deathSaves } = {}) {
      const bar = state.health[characterId];

      if (!bar) {
        return;
      }

      const next = { ...state };
      let moved = false;

      if (hitPoints !== null && hitPoints !== undefined) {
        const landed = Math.min(bar.max, Math.max(0, hitPoints));

        if (landed !== bar.current) {
          next.health = {
            ...state.health,
            [characterId]: { ...bar, current: landed },
          };
          moved = true;
        }
      }

      if (isDead !== undefined && Boolean(isDead) !== state.dead[characterId]) {
        next.dead = { ...state.dead, [characterId]: Boolean(isDead) };
        moved = true;
      }

      if (deathSaves) {
        const held = state.saves[characterId];
        const read = readDeathSaves(deathSaves);

        if (
          held?.successes !== read.successes ||
          held?.failures !== read.failures
        ) {
          next.saves = { ...state.saves, [characterId]: read };
          moved = true;
        }
      }

      if (moved) {
        commit(next);
      }
    },

    /**
     * The hit dice a short rest has spent. Clamped by nothing here: the level is
     * the pool and it moves on its own, so `hitDicePool` holds the tally inside
     * it at the moment it is read rather than at the moment it is written.
     */
    setHitDice(characterId, spent) {
      if (
        !(characterId in state.hitDice) ||
        spent === null ||
        spent === state.hitDice[characterId]
      ) {
        return;
      }

      amend("hitDice", characterId, Math.max(0, spent));
    },

    /**
     * ONE FEATURE, PUT UP OR TAKEN DOWN. Both are idempotent on the id, because
     * the same event reaches this browser twice: once as the answer to its own
     * press, and once off the wire from whoever else is looking at the card.
     */
    addFeature(characterId, feature) {
      const held = state.features[characterId];

      if (!held || !feature?.id || held.some((one) => one.id === feature.id)) {
        return;
      }

      amend("features", characterId, [...held, feature]);
    },

    dropFeature(characterId, featureId) {
      const held = state.features[characterId];

      if (!held || !held.some((one) => one.id === featureId)) {
        return;
      }

      amend(
        "features",
        characterId,
        held.filter((one) => one.id !== featureId),
      );
    },

    /** The whole list again, for a press that was refused. */
    setFeatures(characterId, rows) {
      if (!(characterId in state.features)) {
        return;
      }

      amend("features", characterId, rows);
    },

    /**
     * What one character is under. A whole list rather than a toggle, because
     * this lays down an ANSWER: the press painted its own guess a moment ago,
     * and the row is what settles it.
     */
    setConditions(characterId, conditions) {
      const held = state.conditions[characterId];

      if (!held) {
        return;
      }

      const next = readConditions(conditions);

      if (
        held.length === next.length &&
        held.every((one, index) => one === next[index])
      ) {
        return;
      }

      amend("conditions", characterId, next);
    },

    /** The shield, from a press here or from another chair. Null is unreadable. */
    setArmor(characterId, armorClass) {
      if (
        !(characterId in state.armor) ||
        armorClass === null ||
        armorClass === state.armor[characterId]
      ) {
        return;
      }

      amend("armor", characterId, armorClass);
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
     * Experience.
     * ------------------------------------------------------------------ */

    /**
     * A CHANGE, and the rung it may carry them to. `steppedXp` is the arithmetic
     * `xp_after` mirrors, so the bar filling and the ring turning over are one
     * press rather than a press and a round trip.
     */
    moveXp(characterId, delta) {
      const held = state.xp[characterId];
      const level = state.levels[characterId];

      if (held === undefined || level === undefined || !delta) {
        return null;
      }

      const landed = steppedXp(level, held, delta);

      if (!landed || (landed.xp === held && landed.level === level)) {
        return null;
      }

      commit({
        ...state,
        xp: { ...state.xp, [characterId]: landed.xp },
        levels: { ...state.levels, [characterId]: landed.level },
      });

      return landed;
    },

    /**
     * Where the database settled, laid over what a press painted — and only
     * while that is still what the bar reads. `false` is "somebody has moved
     * on", and the caller uses it to hold its tongue on the wire.
     */
    reconcileXp(characterId, expected, actual) {
      if (
        state.xp[characterId] !== expected.xp ||
        state.levels[characterId] !== expected.level
      ) {
        return false;
      }

      if (actual.xp !== expected.xp || actual.level !== expected.level) {
        commit({
          ...state,
          xp: { ...state.xp, [characterId]: actual.xp },
          levels: { ...state.levels, [characterId]: actual.level },
        });
      }

      return true;
    },

    /** A figure heard from another chair, for a card this browser already has. */
    setXp(characterId, xp, level) {
      if (!(characterId in state.xp) || xp === null || level === null) {
        return;
      }

      if (state.xp[characterId] === xp && state.levels[characterId] === level) {
        return;
      }

      commit({
        ...state,
        xp: { ...state.xp, [characterId]: xp },
        levels: { ...state.levels, [characterId]: level },
      });
    },

    /* ---------------------------------------------------------------------
     * Inspiration.
     * ------------------------------------------------------------------ */

    /**
     * One mark, given or spent. Null is a press that moved nothing — an end
     * already reached, or a card this viewer has no figure for.
     */
    moveInspiration(characterId, delta) {
      const held = state.inspiration[characterId];
      const next = steppedInspiration(held, delta);

      if (next === null) {
        return null;
      }

      amend("inspiration", characterId, next);

      return next;
    },

    /** Where the database settled, laid over what a press painted. */
    reconcileInspiration(characterId, expected, actual) {
      if (state.inspiration[characterId] !== expected) {
        return false;
      }

      if (actual !== expected) {
        amend("inspiration", characterId, actual);
      }

      return true;
    },

    /**
     * Only for a card this browser already HAS a figure for: a mark arriving for
     * somebody whose row came back null is one this viewer may not read.
     */
    setInspiration(characterId, marked) {
      if (
        state.inspiration[characterId] === undefined ||
        state.inspiration[characterId] === null ||
        marked === null ||
        marked === state.inspiration[characterId]
      ) {
        return;
      }

      amend("inspiration", characterId, marked);
    },

    /* ---------------------------------------------------------------------
     * Resting.
     * ------------------------------------------------------------------ */

    /**
     * Everybody who woke. ONE SHAPE for both the press's paint and the server's
     * answer, so a rest is drawn once and confirmed rather than drawn twice.
     */
    rested(rows) {
      const health = { ...state.health };
      const slots = { ...state.slots };
      const dice = { ...state.hitDice };
      let moved = false;

      for (const row of rows ?? []) {
        const bar = health[row.id];

        if (bar && typeof row.currentHp === "number") {
          health[row.id] = {
            ...bar,
            current: Math.min(bar.max, Math.max(0, row.currentHp)),
          };
          moved = true;
        }

        if (row.id in slots && row.spellSlots) {
          slots[row.id] = row.spellSlots;
          moved = true;
        }

        /* A long rest hands half the pool back — see `hitDiceRegained`, which
           `trigger_rest` mirrors. The figure is the database's rather than
           this browser's, so the ribbon and the row cannot disagree. */
        if (row.id in dice && typeof row.hitDiceSpent === "number") {
          dice[row.id] = Math.max(0, row.hitDiceSpent);
          moved = true;
        }
      }

      if (moved) {
        commit({ ...state, health, slots, hitDice: dice });
      }
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
        const experience = { ...next.xp };
        const marked = { ...next.inspiration };
        const health = { ...next.health };
        const shields = { ...next.armor };
        const saves = { ...next.saves };
        const gone = { ...next.dead };
        const suffering = { ...next.conditions };

        for (const member of slices.party) {
          if (member.id in levels) {
            levels[member.id] = member.level;
            experience[member.id] = member.xp ?? 0;
            marked[member.id] = parseInspiration(member.inspiration);
            health[member.id] = {
              current: member.current_hp,
              max: member.max_hp,
            };
            shields[member.id] = parseArmorClass(member.armor_class);
            saves[member.id] = readDeathSaves(member.death_saves);
            gone[member.id] = Boolean(member.is_dead);
            suffering[member.id] = readConditions(member.conditions);
          }
        }

        next = {
          ...next,
          levels,
          xp: experience,
          inspiration: marked,
          health,
          armor: shields,
          saves,
          dead: gone,
          conditions: suffering,
        };
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

      /* Scoped to the characters the answer speaks for, the way the packs and
         the books are: a row list cannot carry the fact that a character now
         has NO features, so a wider replace would blank the rest. */
      if (slices.features && covered.length > 0) {
        const grouped = regroup(
          next.features,
          covered,
          readFeatures(slices.features).map((one) => ({
            ...one,
            character_id: one.characterId,
          })),
        );

        next = { ...next, features: grouped };
      }

      if (slices.sheets) {
        const slots = { ...next.slots };
        const dice = { ...next.hitDice };

        for (const sheet of slices.sheets) {
          slots[sheet.id] = sheet.spell_slots ?? {};

          /* Only into a slot this browser was seeded with: `campaign_sheets`
             answers a Dungeon Master for the whole party, and the tally is what
             the vitals ribbon draws its pool from. */
          if (sheet.id in dice) {
            dice[sheet.id] = Math.max(0, sheet.hit_dice_spent ?? 0);
          }
        }

        next = { ...next, slots, hitDice: dice };
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

export function useCharacterXp(characterId) {
  return useTableValue(
    useCallback((state) => state.xp[characterId] ?? 0, [characterId]),
  );
}

/** What this character is under. The store keeps the array stable. */
export function useConditions(characterId) {
  return useTableValue(
    useCallback(
      (state) => state.conditions[characterId] ?? NO_CONDITIONS,
      [characterId],
    ),
  );
}

const NO_CONDITIONS = Object.freeze([]);

/** What this character can do. The store keeps the array referentially stable. */
export function useFeatures(characterId) {
  return useTableValue(
    useCallback(
      (state) => state.features[characterId] ?? NO_FEATURES,
      [characterId],
    ),
  );
}

/** One frozen list, so a card with no row does not resubscribe every render. */
const NO_FEATURES = Object.freeze([]);

/** How many of the pool a short rest has spent. */
export function useHitDiceSpent(characterId) {
  return useTableValue(
    useCallback((state) => state.hitDice[characterId] ?? 0, [characterId]),
  );
}

/** Null for a card whose shield this viewer may not read. */
export function useArmorClass(characterId) {
  return useTableValue(
    useCallback((state) => state.armor[characterId] ?? null, [characterId]),
  );
}

/** The slice itself, which the store keeps referentially stable. */
export function useDeathSaves(characterId) {
  return useTableValue(
    useCallback((state) => state.saves[characterId] ?? NO_SAVES, [characterId]),
  );
}

export function useIsDead(characterId) {
  return useTableValue(
    useCallback((state) => state.dead[characterId] ?? false, [characterId]),
  );
}

/** One frozen object, so a card with no row does not resubscribe every render. */
const NO_SAVES = Object.freeze({ successes: 0, failures: 0 });

/** Null for a card whose marks this viewer may not read. */
export function useCharacterInspiration(characterId) {
  return useTableValue(
    useCallback(
      (state) => state.inspiration[characterId] ?? null,
      [characterId],
    ),
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

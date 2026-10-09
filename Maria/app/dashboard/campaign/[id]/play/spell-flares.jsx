"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { readSpellFlare } from "sina/rules/spells";

import { FLARE_MS } from "./flare-presentation";
import Flare from "./spell-flare";
import { useTableWire, useWireMessage } from "./table-wire";

/**
 * A cast, seen round the caster's face on the rail and on the board, at every
 * chair. Only the element travels, checked against `SPELL_FLARES`; an id off
 * the wire lights nothing unless this page already draws that character.
 *
 * Each flare removes itself when its life is spent, so a second cast arrives
 * while the first is still fading rather than cutting it off.
 */

const MAX_AT_ONCE = 3;

const NONE = Object.freeze([]);

function createFlareStore() {
  let lit = {};
  let next = 0;
  const listeners = new Set();

  const emit = () => listeners.forEach((listener) => listener());

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    read: (characterId) => lit[characterId] ?? NONE,

    light(characterId, flare) {
      const id = ++next;

      lit = {
        ...lit,
        [characterId]: [...(lit[characterId] ?? NONE), { id, flare }].slice(
          -MAX_AT_ONCE,
        ),
      };
      emit();

      setTimeout(() => {
        const left = (lit[characterId] ?? NONE).filter((one) => one.id !== id);

        lit = { ...lit, [characterId]: left.length ? left : NONE };
        emit();
      }, FLARE_MS);
    },
  };
}

const RESTING = {
  store: { subscribe: () => () => {}, read: () => NONE, light: () => {} },
  cast: () => {},
};

const FlareContext = createContext(RESTING);

export default function SpellFlares({ children }) {
  const [store] = useState(createFlareStore);
  const { send } = useTableWire();

  useWireMessage("flare", (message) => {
    const flare = readSpellFlare(message.flare);

    if (typeof message.characterId === "string" && flare) {
      store.light(message.characterId, flare);
    }
  });

  const cast = useCallback(
    (characterId, flare) => {
      store.light(characterId, flare);
      send({ kind: "flare", characterId, flare });
    },
    [send, store],
  );

  const value = useMemo(() => ({ store, cast }), [cast, store]);

  return (
    <FlareContext.Provider value={value}>{children}</FlareContext.Provider>
  );
}

/** `(characterId, flare)`: light it here and at every other chair. */
export function useCastFlare() {
  return useContext(FlareContext).cast;
}

/** Drop inside a `relative` box round a face. */
export function SpellFlare({ characterId }) {
  const { store } = useContext(FlareContext);

  const flares = useSyncExternalStore(
    store.subscribe,
    () => store.read(characterId),
    () => NONE,
  );

  return flares.map(({ id, flare }) => <Flare key={id} flare={flare} />);
}

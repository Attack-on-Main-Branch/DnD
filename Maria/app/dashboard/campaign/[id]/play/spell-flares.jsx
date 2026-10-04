"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { readSpellFlare } from "sina/rules/spells";

import {
  FLARE_MS,
  FLARE_RECIPES,
  GRADIENT_FILLS,
  PATH_LENGTHS,
  glyphPlacements,
  motePlacements,
  shapeOf,
} from "./flare-presentation";
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

function Flare({ flare }) {
  // `useId` carries characters a `url(#…)` reference does not survive.
  const id = `flare${useId().replace(/[^\w-]/g, "")}`;

  return (
    <span
      aria-hidden="true"
      data-flare={flare}
      className="flare"
      style={{ "--flare-life": `${FLARE_MS}ms` }}
    >
      <span className="flare-aura" />

      <svg viewBox="-50 -50 100 100" className="flare-field">
        <defs>
          <radialGradient id={`${id}-soft`}>
            <stop offset="0" className="flare-stop-core" />
            <stop offset="0.45" className="flare-stop-a" />
            <stop offset="1" className="flare-stop-fade" />
          </radialGradient>

          <linearGradient id={`${id}-tongue`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className="flare-stop-core" />
            <stop offset="0.22" className="flare-stop-a" />
            <stop offset="0.7" className="flare-stop-b" />
            <stop offset="1" className="flare-stop-fade" />
          </linearGradient>

          <linearGradient id={`${id}-blaze`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className="flare-stop-a" />
            <stop offset="0.4" className="flare-stop-b" />
            <stop offset="0.95" className="flare-stop-fade" />
          </linearGradient>
        </defs>

        {FLARE_RECIPES[flare].map((layer, index) => (
          <Layer key={index} layer={layer} gradients={id} />
        ))}
      </svg>
    </span>
  );
}

function Layer({ layer, gradients }) {
  const items =
    layer.kind === "glyph"
      ? glyphPlacements(layer).map(({ transform, delay }, index) => (
          <g key={index} transform={transform}>
            <Shape
              shape={layer.shape}
              index={index}
              gradients={gradients}
              motion={layer.motion}
              style={{ animationDelay: `${delay}ms` }}
            />
          </g>
        ))
      : motePlacements(layer).map(({ x, y, sway, delay }, index) => (
          <g
            key={index}
            className="flare-motion"
            data-motion={layer.motion}
            style={{
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--s": `${sway}px`,
              animationDelay: `${delay}ms`,
            }}
          >
            <Shape shape={layer.shape} index={index} gradients={gradients} />
          </g>
        ));

  return layer.spin ? (
    <g className="flare-spin" data-spin={layer.spin}>
      {items}
    </g>
  ) : (
    items
  );
}

function Shape({ shape, index, gradients, motion, style }) {
  const { circle, d } = shapeOf(shape, index);
  const gradient = GRADIENT_FILLS[shape];

  const props = {
    "data-shape": shape,
    className: motion ? "flare-motion" : undefined,
    "data-motion": motion,
    fill: gradient ? `url(#${gradients}-${gradient})` : undefined,
    style,
  };

  return circle ? (
    <circle r={circle} {...props} />
  ) : (
    <path d={d} pathLength={PATH_LENGTHS[shape]} {...props} />
  );
}

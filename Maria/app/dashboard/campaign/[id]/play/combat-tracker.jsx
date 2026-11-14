"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MAX_INITIATIVE,
  MIN_INITIATIVE,
  parseInitiative,
} from "sina/rules/combat";

import Avatar from "@/app/components/ui/avatar";
import CombatMark from "@/app/components/ui/combat-mark";
import PartyMark from "@/app/components/ui/party-mark";
import { useReducedMotion } from "@/app/components/use-reduced-motion";
import { playReveal } from "@/app/components/ui/reveal-animation";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useInCombat } from "./table-state";
import { useCombat } from "./use-combat";
import "./combat-tracker.css";

export default function CombatTracker({ display = false, ...props }) {
  return display ? (
    <CombatContent {...props} display />
  ) : (
    <AnimatedCombatTracker {...props} />
  );
}

function AnimatedCombatTracker({ canManage = false, ...props }) {
  const inCombat = useInCombat();
  return (
    <InitiativeReveal
      next={inCombat ? "tracker" : canManage ? "start" : null}
      tracker={
        <CombatContent {...props} canManage={canManage} mode="tracker" />
      }
      start={<CombatContent {...props} canManage mode="start" />}
    />
  );
}

function CombatContent({
  campaignId,
  faces,
  canManage = false,
  display = false,
  seatCharacterId,
  mode,
}) {
  const combat = useCombat(campaignId, faces, display);
  const { inCombat, activeTokenId, round, pieces, begin } = combat;

  if (!display) {
    if (mode === "start") {
      return (
        <button
          type="button"
          onClick={begin}
          className="workspace-tool mt-2 border border-gold/30 text-gold"
        >
          <CombatMark className="workspace-tool-icon" />
          Start combat
        </button>
      );
    }

    return (
      <InitiativeOrder
        combat={combat}
        canManage={canManage}
        seatCharacterId={seatCharacterId}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <h2 className="font-display text-xs font-semibold tracking-[0.18em] text-gold/80 uppercase">
          Initiative
        </h2>

        {/* It moves on the wrap and nothing else, so the number is exactly how
            many times the ladder has been round. */}
        {inCombat && (
          <p className="shrink-0 font-mono text-[0.625rem] tracking-[0.2em] text-rose-300/80 uppercase">
            Round {round}
          </p>
        )}
      </div>

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      {pieces.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink/50 italic">
          {!inCombat
            ? "No active combat."
            : "No pieces are standing on this battlefield."}
        </p>
      ) : (
        <div className="scroll-gold min-h-0 flex-1 overflow-hidden px-3 py-2">
          <ol className="flex flex-col gap-1.5">
            {pieces.map((piece) => (
              <DisplayRung
                key={piece.id}
                piece={piece}
                active={inCombat && piece.id === activeTokenId}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function InitiativeReveal({ next, tracker, start }) {
  const [shown, setShown] = useState(next);
  const node = useRef(null);
  const reduceMotion = useReducedMotion();

  if (shown === null && next !== null) setShown(next);

  useLayoutEffect(() => {
    if (shown === null) return;

    const open = shown === next;
    const animation = playReveal(
      node.current,
      `initiative-reveal-${shown}`,
      open,
    );
    let current = true;
    Promise.resolve(animation).then(
      () => {
        if (current && !open) setShown(next);
      },
      () => {},
    );
    return () => {
      current = false;
    };
  }, [next, reduceMotion, shown]);

  if (shown === null) return null;

  return (
    <div
      key={shown}
      ref={node}
      className="initiative-reveal"
      data-reveal={shown}
      inert={shown !== next || undefined}
    >
      {shown === "tracker" ? tracker : start}
    </div>
  );
}

function mayWriteInitiative(piece, canManage, seatCharacterId) {
  return (
    canManage ||
    Boolean(
      seatCharacterId &&
      piece.characterId === seatCharacterId &&
      piece.initiative === null,
    )
  );
}

function InitiativeOrder({ combat, canManage, seatCharacterId }) {
  const {
    activeTokenId,
    pieces,
    order,
    round,
    conclude,
    nextTurn,
    setInitiative,
  } = combat;
  const scroller = useRef(null);
  const activeIndex = pieces.findIndex((piece) => piece.id === activeTokenId);

  useLayoutEffect(() => {
    const viewport = scroller.current;
    const list = viewport?.firstElementChild;
    const row = list?.children[activeIndex];
    if (!row) return;

    function center() {
      const bounds = row.getBoundingClientRect();
      viewport.scrollTop +=
        bounds.top -
        viewport.getBoundingClientRect().top +
        (bounds.height - viewport.clientHeight) / 2;
    }

    center();
    const observer = new ResizeObserver(center);
    observer.observe(viewport);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex, activeTokenId, round]);

  return (
    <section aria-label="Initiative" className="initiative-tracker">
      <div className="initiative-header">
        <div className="initiative-heading">
          <h2>Initiative</h2>
          <span>Round {round}</span>
        </div>
        {canManage && (
          <div className="initiative-actions">
            <button type="button" onClick={conclude} className="initiative-end">
              End combat
            </button>
            <button
              type="button"
              onClick={nextTurn}
              disabled={order.length === 0}
              className="initiative-next"
            >
              Next turn
            </button>
          </div>
        )}
      </div>
      {pieces.length ? (
        <div ref={scroller} className="initiative-scroll scroll-gold">
          <ol aria-label="Turn order" className="initiative-order">
            {pieces.map((piece) => (
              <InitiativeEntry
                key={piece.id}
                piece={piece}
                active={piece.id === activeTokenId}
                onWrite={
                  mayWriteInitiative(piece, canManage, seatCharacterId)
                    ? setInitiative
                    : undefined
                }
              />
            ))}
          </ol>
        </div>
      ) : (
        <p className="px-3 py-2 text-xs text-ink/60">
          No combatants on the map.
        </p>
      )}
    </section>
  );
}

function InitiativeEntry({ piece, active, onWrite }) {
  return (
    <li
      aria-current={active ? "step" : undefined}
      className="initiative-row"
      data-enemy={Boolean(piece.templateId) || undefined}
    >
      <div className="initiative-capsule">
        <span
          className="initiative-face"
          data-tooltip={piece.isHidden ? "Hidden from players" : piece.label}
          data-tooltip-title={piece.isHidden ? piece.label : undefined}
        >
          <Face piece={piece} />
        </span>
        {onWrite ? (
          <InitiativeBox
            key={written(piece.initiative)}
            piece={piece}
            onWrite={onWrite}
          />
        ) : (
          <span
            aria-label={`Initiative for ${piece.label}`}
            className="initiative-number"
          >
            {written(piece.initiative) || "—"}
          </span>
        )}
      </div>
    </li>
  );
}

function DisplayRung({ piece, active }) {
  const current = useRef(null);

  useEffect(() => {
    if (active) current.current?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <li
      ref={current}
      aria-current={active ? "step" : undefined}
      className={`flex w-full items-center gap-1.5 rounded-full border pr-1.5 transition-[border-color,box-shadow,background-color] duration-300 ${
        active
          ? "border-amber-300 bg-amber-400/15 shadow-[0_0_12px_var(--gold-70)]"
          : "border-gold/20 bg-surface/40"
      }`}
    >
      <Face piece={piece} edge="-my-px -ml-px" />
      <span
        className={`min-w-0 flex-1 wrap-anywhere py-1 font-display text-xs leading-tight tracking-wide ${active ? "text-amber-100" : "text-ink/75"}`}
      >
        {piece.label}
      </span>
      <span
        aria-label={`Initiative for ${piece.label}`}
        className="w-9 shrink-0 text-center font-display text-sm font-bold text-gold tabular-nums"
      >
        {written(piece.initiative) || "—"}
      </span>
    </li>
  );
}

/**
 * Held locally while it is typed and committed on the way out: the ladder
 * REORDERS on every commit, and writing straight through would move the row out
 * from under the caret between the "1" and the "5" of fifteen.
 */
function InitiativeBox({ piece, onWrite }) {
  const [typed, setTyped] = useState(() => written(piece.initiative));

  function commit(value) {
    const asked = value === "" ? null : parseInitiative(value);

    // Unreadable is left alone rather than silently cleared: the caret is in
    // there and the number they meant is half typed.
    if (value !== "" && asked === null) {
      setTyped(written(piece.initiative));
      return;
    }

    onWrite(piece.id, asked);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={MIN_INITIATIVE}
      max={MAX_INITIATIVE}
      value={typed}
      // A piece that has not rolled is out of the fight.
      placeholder="—"
      aria-label={`Initiative for ${piece.label}`}
      onChange={(event) => setTyped(event.target.value)}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      /* Bare and not `controlClasses`: the capsule is already the rim.
         `no-spin` takes the browser's steppers off — see globals.css. */
      className="initiative-number no-spin border-none bg-transparent p-0 shadow-none outline-none placeholder:text-ink/30"
    />
  );
}

/** The board's own three faces from map-token.jsx, without the rims and shadows
    that only mean something over a picture. `edge` is what makes the circle the
    capsule's end rather than something inside it. */
function Face({ piece, edge = "" }) {
  if (piece.isPartyMarker) {
    return <PartyMark className={`size-7 shrink-0 ${edge}`} />;
  }

  if (piece.characterId) {
    return (
      <Avatar
        src={piece.src}
        color={piece.color}
        size="xs"
        ring={false}
        className={`shrink-0 ${edge}`}
      />
    );
  }

  return (
    <span
      style={{ borderColor: piece.ringColor }}
      className={`box-border grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-surface ${edge}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={piece.src}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}

function written(initiative) {
  return Number.isInteger(initiative) ? String(initiative) : "";
}

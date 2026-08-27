"use client";

import { useState } from "react";
import { CONDITIONS } from "sina/rules/conditions";

import { conditionDress } from "@/app/dashboard/condition-presentation";

import { useConditions } from "./table-state";

/**
 * What a character is under, along the foot of their card — BELOW the bar, the
 * saves, or whatever else the card's bottom half is showing.
 *
 * PUBLIC. Every chair draws these on every card — a character standing there
 * poisoned in front of the party is the least secret thing at a table, and
 * `campaign_party` hands the column over unnarrowed for exactly that reason.
 *
 * IT OPENS THE WAY THE HIT-POINT STEPPER DOES, on `.tray-fold`, and in the same
 * PLACE: sat above the bar these were a row inserted mid-card, so a condition
 * landing on somebody pushed their hit points down the screen. There is no box
 * around them — a second surface inside a card that is already glass read as a
 * hole rather than a container.
 *
 * IT CLOSES ON THE LIST IT HAD. Taking the last badge off emptied the row in
 * the same frame the fold began, so there was nothing left to watch closing.
 * `drawn` is the last list that had something in it. Reconciled during render,
 * and safe to compare by identity because the store keeps the array stable.
 */
export default function CardConditions({ characterId }) {
  const held = useConditions(characterId);
  const shown = held.length > 0;

  const [drawn, setDrawn] = useState(held);

  if (shown && drawn !== held) {
    setDrawn(held);
  }

  return (
    <div
      inert={!shown || undefined}
      className={`tray-fold ${shown ? "" : "tray-folded pointer-events-none"}`}
    >
      {/* `.fold-body` — see globals.css: what lets the row reach zero. */}
      <div className="fold-body">
        <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          {drawn.map((key, index) => (
            <li key={key} className="flex items-center gap-2">
              {index > 0 && (
                /* `leading-none` for the reason the name beside it has it: an
                   11px dot on the inherited line height is a 16.5px line box
                   against the name's 12, so the SECOND badge made the whole row
                   four pixels taller than the first. */
                <span
                  aria-hidden="true"
                  className="text-[11px] leading-none text-ink/25"
                >
                  ·
                </span>
              )}

              <span
                className={`font-display text-[12px] leading-none tracking-wide ${conditionDress(key).color}`}
              >
                {CONDITIONS[key].name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

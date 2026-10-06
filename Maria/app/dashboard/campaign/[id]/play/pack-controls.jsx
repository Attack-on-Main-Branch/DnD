"use client";

import { MAX_ITEM_QUANTITY, parseQuantity } from "sina/rules/inventory";

import Avatar from "@/app/components/ui/avatar";
import { controlClasses } from "@/app/components/ui/field-styles";
import { diceColorHex } from "@/app/dashboard/character-presentation";

/**
 * The controls a player's drawer is built out of, shared by what is in the
 * pack and what is in the purse.
 *
 * They were written inline in player-pack-drawer.jsx when an item was the only
 * thing that could be used or handed over. A coin is handed over the same way,
 * down to the wording of the button, so they moved here rather than being
 * written a second time — "hand three arrows to Fern" and "hand three gold to
 * Fern" must not be able to drift into two different gestures.
 *
 * The confirmations are inline and not a `<dialog>`: a modal opens in the top
 * layer, so the pointerdown that dismisses it lands outside the panel, and
 * TablePopover closes on exactly that.
 */

/**
 * Not `buttonClasses`: those are pills with their own padding, and three across
 * a card 300px wide would wrap onto three lines.
 */
export function Action({ onClick, disabled, label, pressed, tone, children }) {
  // `danger` is the dashboard's Retire and Delete: ink at rest, red under the
  // pointer, so the warning arrives when the click is about to happen.
  const colour =
    {
      danger: "text-ink/60 hover:text-red-500",
      gold: "text-gold hover:text-ink",
    }[tone] ?? "text-ink/65 hover:text-gold";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className={`shrink-0 cursor-pointer rounded-md px-2 py-1 font-display text-xs tracking-wide transition-colors duration-300 disabled:cursor-not-allowed disabled:text-ink/25 ${
        pressed ? "bg-gold/15 text-gold" : colour
      }`}
    >
      {children}
    </button>
  );
}

/** The question on the left, the way out, then the deed at the far right. */
export function Confirm({ question, children }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <p className="text-xs text-ink/70">{question}</p>

      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * Who is at the other end of a hand-over.
 *
 * Buttons rather than a `<select>`: at most five names, each carrying the face
 * the rail already shows.
 *
 * The list is a convenience and not a permission — `transfer_inventory_item`
 * and `transfer_currency` both re-check that the two characters share a table
 * and that this one is the caller's to give from, so a receiver's id arriving
 * from here decides nothing.
 */
/**
 * Where a stack is going INSIDE one coat: the pack, or one of its bags.
 * `PartyChoice`'s twin, separate because that one names PEOPLE and carries a
 * face for each, and a pocket has none.
 *
 * Not a permission: `move_inventory_item` re-checks every bag named.
 */
export function StowChoice({
  places,
  chosen,
  onChoose,
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  children,
}) {
  return (
    <div className="mt-2.5 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <ul className="flex flex-col gap-1">
        {places.map((place) => (
          <li key={place.id ?? "pack"}>
            <button
              type="button"
              onClick={() => onChoose(place.id)}
              aria-pressed={chosen === place.id}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-300 ${
                chosen === place.id
                  ? "bg-gold/15 text-gold"
                  : "text-ink/70 hover:bg-gold/10 hover:text-gold"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{place.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Action onClick={onCancel} label="Leave it where it is">
          Cancel
        </Action>

        <Action
          onClick={onConfirm}
          disabled={disabled || chosen === undefined}
          tone="gold"
          label={confirmLabel}
        >
          {children}
        </Action>
      </div>
    </div>
  );
}

export function PartyChoice({
  party,
  receiver,
  onChoose,
  onCancel,
  onConfirm,
  confirmLabel,
  disabled,
  children,
}) {
  return (
    <div className="mt-2.5 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2">
      <ul className="flex flex-col gap-1">
        {party.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => onChoose(member.id)}
              aria-pressed={receiver === member.id}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-300 ${
                receiver === member.id
                  ? "bg-gold/15 text-gold"
                  : "text-ink/70 hover:bg-gold/10 hover:text-gold"
              }`}
            >
              <Avatar
                src={member.avatar_url}
                color={diceColorHex(member.dice_color)}
                size="xs"
              />
              <span className="min-w-0 flex-1 truncate">{member.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Action onClick={onCancel} label="Keep it">
          Cancel
        </Action>

        <Action
          onClick={onConfirm}
          disabled={disabled || !receiver}
          tone="gold"
          label={confirmLabel}
        >
          {children}
        </Action>
      </div>
    </div>
  );
}

/**
 * How many of an item a deed takes: the field, a step either way to its left,
 * and how many there are to its right. The caller opens it at one. A step
 * never goes under one or over `max`; a giver has no ceiling but the rules'.
 */
export function QuantityField({
  value,
  onChange,
  name,
  max = MAX_ITEM_QUANTITY,
  of = null,
  className = "",
}) {
  const current = parseQuantity(value) ?? 0;
  const ceiling = Math.max(1, Math.min(max, MAX_ITEM_QUANTITY));

  function step(delta) {
    onChange(String(Math.min(ceiling, Math.max(1, current + delta))));
  }

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      {/* Stretched to the field's height, whatever the field's padding. */}
      <div className="flex shrink-0 flex-col self-stretch overflow-hidden rounded-md border border-gold/20 bg-surface/30">
        <Nudge
          up
          onClick={() => step(1)}
          disabled={current >= ceiling}
          label={`One more ${name}`}
        />
        <span aria-hidden="true" className="h-px bg-gold/20" />
        <Nudge
          onClick={() => step(-1)}
          disabled={current <= 1}
          label={`One fewer ${name}`}
        />
      </div>

      {/* Width on the wrapper: `controlClasses` carries `w-full`. */}
      <div className="w-16 shrink-0">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          placeholder="Qty"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              step(event.key === "ArrowUp" ? 1 : -1);
            }
          }}
          aria-label={`How many ${name}`}
          className={controlClasses({
            className: "px-2 py-1 text-center tabular-nums",
          })}
        />
      </div>

      {of !== null && (
        <p className="text-sm text-ink/60 tabular-nums">of {of}</p>
      )}
    </div>
  );
}

function Nudge({ up = false, onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid w-6 flex-1 cursor-pointer place-items-center text-ink/60 transition-colors duration-300 hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:text-ink/20 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-3 ${up ? "" : "rotate-180"}`}
      >
        <path d="m3 7.5 3-3 3 3" />
      </svg>
    </button>
  );
}

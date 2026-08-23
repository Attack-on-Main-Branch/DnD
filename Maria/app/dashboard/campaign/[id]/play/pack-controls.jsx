"use client";

import Avatar from "@/app/components/ui/avatar";
import {
  avatarColorClass,
  characterInitials,
} from "@/app/dashboard/character-presentation";

/**
 * The three controls a player's drawer is built out of, shared by what is in
 * the pack and what is in the purse.
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
                initials={characterInitials(member.name)}
                colorClass={avatarColorClass(member.color_theme)}
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

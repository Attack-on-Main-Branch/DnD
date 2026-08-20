"use client";

import { useEffect, useRef } from "react";
import { inviteDetails, isAnswerable } from "sina/rules/notifications";

import { openChangelog } from "@/app/components/changelog-control";
import { buttonClasses } from "@/app/components/ui/button";
import {
  FADED_RULE_CLASSES,
  surfaceClasses,
} from "@/app/components/ui/surface";

/** Same UTC formatting as the campaign page, so a date cannot rehydrate differently. */
const SENT_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

/** Everything a Tab can reach, for the keyboard loop below. */
const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One family of text actions for every kind of notification, whatever it is
 * asking. Accept, Decline, Read and Clear are the same object in two tones —
 * gold for the thing the card is offering, muted for turning it down or
 * sweeping it away — because a slab of a button inside a 22rem dropdown reads
 * as a second panel rather than as a choice.
 *
 * The quiet one is written out rather than composed from `buttonClasses`: two
 * colour utilities on one element are decided by the order Tailwind emits them,
 * not by which came last in the string, so `className: "text-ink/45"` over the
 * variant's `text-gold` is a coin toss.
 */
const ACTION_CLASSES = buttonClasses({ variant: "link" });

const QUIET_ACTION_BASE =
  "inline-flex items-center rounded-sm text-sm font-medium text-ink/45 " +
  "underline underline-offset-4 transition-colors duration-300 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const QUIET_ACTION_CLASSES = `${QUIET_ACTION_BASE} hover:text-ink/80`;

/**
 * Turning an invitation down is the destructive half of the pair, so it takes
 * the red the retire control on a character card uses — the same ink as its
 * neighbours while it is only sitting there, and a warning at the moment the
 * pointer is on it.
 */
const DECLINE_ACTION_CLASSES = `${QUIET_ACTION_BASE} hover:text-red-500`;

/**
 * The dropdown behind the envelope: what has arrived, and what can be done
 * about it.
 *
 * `variant: "solid"` rather than the page-level glass, for two reasons that
 * point the same way. It hangs over the page, where a translucent panel lets
 * the text underneath read straight through it; and it is nested inside the
 * header, which is itself a `backdrop-filter` element and therefore a backdrop
 * root — a filter in here would sample the header's own flat fill and give back
 * a tint for the cost of a compositor readback. See surface.js.
 *
 * The padding is the panel's own rather than `PANEL_CLASSES`: that geometry is
 * for a page-width sheet, and 2rem of inset around a 22rem dropdown leaves no
 * room for the list. The corner is the same one every surface uses.
 *
 * Mounted whether or not it is open, the way the changelog drawer is, so it can
 * unfold and fold rather than appear: an element React has just removed has
 * nothing left to animate. `inert` while closed — off-screen is not
 * unreachable, and without it every control in here stays in the tab order.
 */
export default function NotificationPopover({
  id,
  open,
  notifications,
  busyId,
  error,
  onAccept,
  onDecline,
  onDismiss,
  onClose,
  triggerRef,
}) {
  const panelRef = useRef(null);

  // Focus moves in with the panel, or Escape has nothing to catch and the
  // dropdown opens somewhere a keyboard cannot reach.
  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;

    (panel?.querySelector(FOCUSABLE) ?? panel)?.focus();
  }, [open]);

  // Anywhere outside closes, and pointerdown rather than click so a drag that
  // starts outside does not leave it open behind the pointer.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (
        !panelRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        onClose({ restoreFocus: false });
      }
    }

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose, triggerRef]);

  /**
   * Escape closes; Tab stays inside. A dropdown does not usually trap focus,
   * and this one does because everything in it is an action taken on a request
   * from somebody else — tabbing out of a half-answered invitation and leaving
   * it open behind the page is the worse outcome.
   */
  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose({ restoreFocus: true });
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const stops = [...panelRef.current.querySelectorAll(FOCUSABLE)];

    if (stops.length === 0) {
      event.preventDefault();
      return;
    }

    const first = stops[0];
    const last = stops[stops.length - 1];
    const here = document.activeElement;

    if (event.shiftKey && (here === first || here === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && here === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
      inert={!open}
      onKeyDown={onKeyDown}
      className={surfaceClasses({
        variant: "solid",
        glow: true,
        className: [
          // Centred on the envelope from `sm`. Below that the bar has no room
          // for it: at 375px a 21rem panel centred on this control hangs off
          // the left edge, so it hooks to the trigger's right edge instead.
          "absolute top-full right-0 z-30 mt-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
          "w-[min(21rem,calc(100vw-2rem))] rounded-2xl outline-none",
          // The unfold. `scale` is its own property in Tailwind v4, so it
          // composes with the `translate` above instead of overwriting it, and
          // `origin-top` is what makes it grow downwards out of the arrow and
          // fold back up into it. The closing curve is the opening one
          // reversed — an ease-out played backwards crawls into its end.
          // `border-color` and `box-shadow` are in the list because `.glow-gold`
          // declares its own `transition` in the components layer, and a
          // `transition-*` utility replaces that property wholesale — leaving
          // them out made the rim snap between its lit and resting states.
          "group origin-top transition-[scale,opacity,border-color,box-shadow] duration-300",
          open
            ? "ease-tray scale-y-100 opacity-100"
            : "pointer-events-none ease-tray-in scale-y-0 opacity-0",
          "motion-reduce:transition-none",
        ].join(" "),
      })}
    >
      {/*
        The pointer up at the envelope, the same shape the class picker hangs
        under a chosen archetype: a square turned 45°, showing only the two
        borders that fall on its outer edges.

        The rim tracks the panel's. `.glow-gold` lights the panel's own border
        on hover and focus-within, and focus is inside this panel for as long as
        it is open — so a fixed `gold/25` here left the arrow visibly duller
        than the edge it is meant to continue.
      */}
      <span
        aria-hidden="true"
        className="absolute -top-1.5 right-[0.9375rem] size-2.5 rotate-45 border-t border-l border-gold/25 bg-[var(--surface-96)] transition-colors duration-300 group-focus-within:border-gold/60 group-hover:border-gold/60 sm:right-auto sm:left-1/2 sm:-translate-x-1/2"
      />

      <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
        <h2 className="font-display text-sm font-semibold tracking-wide text-gold">
          Sealed missives
        </h2>
        <p className="font-mono text-xs tracking-[0.2em] text-ink/45 uppercase">
          {notifications.length}
        </p>
      </div>

      {/* The hairline the header and the changelog drawer both carry. */}
      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      {notifications.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink/50 italic">
          No sealed missives in your keeping.
        </p>
      ) : (
        <ul className="scroll-gold max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              // The settings page's rule, drawn between rows instead of above
              // sections — `last:` drops it from the bottom of the list, where
              // the panel's own edge is already the divider.
              className="border-b border-gold/10 px-5 py-4 last:border-b-0"
            >
              <NotificationItem
                notification={notification}
                busy={busyId === notification.id}
                onAccept={onAccept}
                onDecline={onDecline}
                onDismiss={onDismiss}
                onOpenChangelog={() => {
                  onClose({ restoreFocus: false });
                  openChangelog({ returnFocus: triggerRef.current });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p
          role="alert"
          className="border-t border-gold/10 px-5 py-3 text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  busy,
  onAccept,
  onDecline,
  onDismiss,
  onOpenChangelog,
}) {
  const invite = inviteDetails(notification);
  const waiting = isAnswerable(notification);

  return (
    <article>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 font-display text-sm font-semibold tracking-wide text-ink">
          {/*
            An invitation is drawn from `data`, not from the sentence the
            database stored: the campaign's title and the character's handle are
            the user's own words, and everything around them is Maria's. An
            announcement is the other way round — that copy was written here in
            the first place, so the stored version is the one to show.

            The campaign's name takes the accent and the words around it do not,
            so the eye lands on which campaign is asking rather than on the fact
            that something is.
          */}
          {invite ? (
            <>
              An invitation to{" "}
              <span className="text-gold">{invite.campaignTitle}</span>
            </>
          ) : (
            notification.title
          )}
        </h3>

        <time
          dateTime={notification.created_at}
          className="shrink-0 font-mono text-xs tracking-wide text-ink/40"
        >
          {SENT_FORMAT.format(new Date(notification.created_at))}
        </time>
      </div>

      <p className="mt-1 text-sm leading-relaxed text-pretty text-ink/70">
        {invite ? (
          <>
            <span className="font-mono text-xs text-gold/75">
              {invite.characterName}
              {invite.characterDiscriminator
                ? `#${invite.characterDiscriminator}`
                : ""}
            </span>{" "}
            is called to the party.
          </>
        ) : (
          notification.message
        )}
      </p>

      {/*
        Clear in the left corner, and whatever the card is offering in the right
        one, with the way out of it immediately to its left. Same order on every
        kind of notification, so the control under the pointer does not change
        meaning from one card to the next.

        Clear is on every card, unanswered ones included. Sweeping an invitation
        away is not a reply — nothing goes back to whoever sent it — but leaving
        an invitation you do not want to answer stuck in the inbox with the pip
        lit is worse than letting it go.

        The answer an invitation already has takes the same place the buttons
        did, so a card does not change height when it is answered.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          disabled={busy}
          aria-label={`Clear ${notification.title}`}
          className={QUIET_ACTION_CLASSES}
        >
          Clear
        </button>

        <div className="ml-auto flex items-center gap-5">
          {waiting && (
            <>
              <button
                type="button"
                onClick={() => onDecline(notification.id)}
                disabled={busy}
                className={DECLINE_ACTION_CLASSES}
              >
                Decline
              </button>

              <button
                type="button"
                onClick={() => onAccept(notification.id)}
                disabled={busy}
                className={ACTION_CLASSES}
              >
                Accept
              </button>
            </>
          )}

          {!waiting && notification.type === "campaign_invite" && (
            <p className="font-mono text-[10px] tracking-[0.16em] text-ink/40 uppercase">
              {notification.status === "accepted" ? "Accepted" : "Declined"}
            </p>
          )}

          {notification.type === "system_changelog" && (
            <button
              type="button"
              onClick={onOpenChangelog}
              className={ACTION_CLASSES}
            >
              Read the grimoire
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { countUnread, isUnread } from "sina/rules/notifications";

import {
  acceptCampaignInvite,
  announceCurrentVersion,
  declineCampaignInvite,
  dismissNotification,
  markAnnouncementsRead,
} from "@/app/actions/notifications";

import NotificationPopover from "./notification-popover";
import { useLiveRefresh } from "./use-live-refresh";
import WaxSealEnvelope from "./wax-seal-envelope";

/**
 * The envelope in the header, and the inbox behind it.
 *
 * The list is a prop, not state: it is rendered on the server by the dashboard
 * layout, and every path that changes it — a Server Action, or a change
 * arriving over the socket — ends in the server re-rendering this tree. Holding
 * a second copy here would mean two answers to the same question.
 *
 * `useOptimistic` is the exception, and it is not a second copy so much as the
 * few hundred milliseconds before the first one catches up: an invitation
 * answers instantly and reverts if the server disagrees.
 */
export default function NotificationButton({
  notifications,
  userId,
  announce,
}) {
  const router = useRouter();
  const panelId = useId();
  const triggerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();

  const [items, applyOptimistic] = useOptimistic(
    notifications,
    (current, change) =>
      change.kind === "dismiss"
        ? current.filter((item) => item.id !== change.id)
        : current.map((item) =>
            item.id === change.id ? { ...item, status: change.status } : item,
          ),
  );

  const unread = countUnread(items);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  useLiveRefresh({
    channel: `notifications:${userId}`,
    table: "notifications",
    // Bandwidth, not security — the SELECT policy is what decides what may be
    // delivered at all. See Sina/src/supabase/realtime.js.
    filter: `user_id=eq.${userId}`,
    onChange: refresh,
  });

  /*
   * A deploy the reader has not been told about. The layout worked out that
   * this is the case; posting the notice is a write, so it happens from here
   * rather than during a render. Idempotent at the database, and guarded here
   * as well so two renders in one mount cannot both ask.
   */
  const announced = useRef(false);

  useEffect(() => {
    if (!announce || announced.current) {
      return;
    }

    announced.current = true;
    startTransition(async () => {
      await announceCurrentVersion();
    });
  }, [announce]);

  const close = useCallback(({ restoreFocus = true } = {}) => {
    // `error` is deliberately left alone and cleared on the next open instead:
    // blanking a message a beat before the panel it belongs to has finished
    // folding reads as a glitch.
    setOpen(false);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  function toggle() {
    if (open) {
      close({ restoreFocus: false });
      return;
    }

    setError(null);
    setOpen(true);

    // Opening the inbox is what reads an announcement. Invitations are left
    // alone: one stays unread until it is answered. Asked for only when there
    // is one to read, or every open would cost an UPDATE and a re-render for
    // an inbox that has nothing new in it.
    if (
      items.some((item) => item.type === "system_changelog" && isUnread(item))
    ) {
      startTransition(async () => {
        await markAnnouncementsRead();
      });
    }
  }

  function run(id, change, work) {
    setError(null);
    setBusyId(id);

    startTransition(async () => {
      applyOptimistic(change);

      const result = await work();

      setBusyId(null);

      if (result?.kind === "rejected") {
        setError(result.message);
      }
    });
  }

  return (
    /*
     * `self-stretch` so this wrapper is as tall as the bar's content row rather
     * than as tall as the button in it. `top-full` on the panel then means the
     * bottom of the row, and the `mt-3` below it is exactly the bar's own
     * `py-3` — which is what puts the panel's top edge on the hairline under
     * the header instead of a few pixels above it. Measuring from the button
     * cannot do that: the row is 48px tall where the profile pill shows and
     * 40px where it does not, so the gap under a 40px button changes with the
     * breakpoint.
     */
    <div className="relative flex items-center self-stretch">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        // The count belongs in the name rather than beside the pip: the pip is
        // a colour and a position, and neither is announced.
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        // `text-ink/60` is the ink the fact labels on a character card use —
        // Race, Class, Alignment, Level. The same grey, so the envelope sits at
        // the weight of a label rather than of a heading.
        className="relative grid size-10 place-items-center rounded-full text-ink/60 transition-colors duration-300 hover:text-gold"
      >
        {/* Sized against the pill and the two buttons beside it rather than
            against its own hit area: 36px is the avatar circle in the profile
            pill, and a 24px glyph next to it read as an afterthought. */}
        <WaxSealEnvelope className="size-9" />

        {/* Clear of the envelope's own corner now that the envelope fills the
            button — at `top-1` the pip sat on the parchment. */}
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="seal-pip absolute top-0 right-0 size-2.5 rounded-full border border-gold/70 bg-ruby"
          />
        )}
      </button>

      {/* Always mounted, so it can fold away rather than vanish. */}
      <NotificationPopover
        id={panelId}
        open={open}
        notifications={items}
        busyId={busyId}
        error={error}
        triggerRef={triggerRef}
        onClose={close}
        onAccept={(id) =>
          run(id, { kind: "status", id, status: "accepted" }, () =>
            acceptCampaignInvite(id),
          )
        }
        onDecline={(id) =>
          run(id, { kind: "status", id, status: "declined" }, () =>
            declineCampaignInvite(id),
          )
        }
        onDismiss={(id) =>
          run(id, { kind: "dismiss", id }, () => dismissNotification(id))
        }
      />
    </div>
  );
}

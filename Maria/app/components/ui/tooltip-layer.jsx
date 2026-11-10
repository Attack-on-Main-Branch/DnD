"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function TooltipLayer() {
  const [note, setNote] = useState(null);
  const popupRef = useRef(null);
  const id = useId();

  useEffect(() => {
    let hovered = null;
    let focused = null;
    let dismissed = null;
    let keyboard = false;

    function anchorFor(target) {
      return target instanceof Element
        ? target.closest("[data-tooltip]")
        : null;
    }

    function show() {
      const anchor = keyboard ? (focused ?? hovered) : (hovered ?? focused);
      if (
        !anchor?.dataset.tooltip ||
        anchor === dismissed ||
        anchor.closest("[inert]")
      ) {
        setNote(null);
        return;
      }
      const described = anchor.contains(document.activeElement)
        ? document.activeElement
        : anchor;
      setNote((current) =>
        current?.anchor === anchor &&
        current.described === described &&
        current.text === anchor.dataset.tooltip &&
        current.title === anchor.dataset.tooltipTitle
          ? current
          : {
              anchor,
              described,
              title: anchor.dataset.tooltipTitle,
              text: anchor.dataset.tooltip,
            },
      );
    }

    function enter(event) {
      if (event.pointerType === "touch") return;
      keyboard = false;
      hovered = anchorFor(event.target);
      if (hovered !== dismissed) dismissed = null;
      show();
    }

    function leave(event) {
      if (
        hovered &&
        (!(event.relatedTarget instanceof Node) ||
          !hovered.contains(event.relatedTarget))
      ) {
        hovered = null;
        show();
      }
    }

    function focus(event) {
      keyboard = true;
      focused = anchorFor(event.target);
      if (focused !== dismissed) dismissed = null;
      show();
    }

    function blur(event) {
      focused = anchorFor(event.relatedTarget);
      show();
    }

    function dismiss() {
      dismissed = keyboard ? (focused ?? hovered) : (hovered ?? focused);
      setNote(null);
    }

    function press(event) {
      dismissed = anchorFor(event.target) ?? hovered ?? focused;
      setNote(null);
    }

    function keydown(event) {
      if (event.key === "Escape") dismiss();
    }

    document.addEventListener("pointerover", enter, { passive: true });
    document.addEventListener("pointerout", leave, { passive: true });
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", blur);
    document.addEventListener("pointerdown", press, { passive: true });
    document.addEventListener("keydown", keydown);
    document.addEventListener("scroll", dismiss, true);
    document.addEventListener("close", dismiss, true);
    window.addEventListener("resize", dismiss);

    return () => {
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", blur);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("close", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, []);

  useLayoutEffect(() => {
    if (!note) return;
    const popup = popupRef.current;
    const anchor = note.anchor;
    if (!popup?.isConnected || !anchor.isConnected) return;
    const popover = typeof popup.showPopover === "function";
    if (popover) popup.showPopover();
    else popup.removeAttribute("popover");

    const box = anchor.getBoundingClientRect();
    const tip = popup.getBoundingClientRect();
    const gap = 8;
    const gutter = 12;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.max(
      gutter,
      Math.min(
        box.left + (box.width - tip.width) / 2,
        viewportWidth - tip.width - gutter,
      ),
    );
    const top =
      box.top >= tip.height + gap + gutter
        ? box.top - tip.height - gap
        : Math.min(box.bottom + gap, viewportHeight - tip.height - gutter);
    popup.style.left = `${left}px`;
    popup.style.top = `${Math.max(gutter, top)}px`;
    popup.style.visibility = "visible";
    const entrance = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? null
      : popup.animate(
          [
            { opacity: 0, transform: "scale(0.95)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 150, easing: "ease-out" },
        );

    const described = note.described;
    const descriptions = (described.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter(Boolean);
    described.setAttribute("aria-describedby", [...descriptions, id].join(" "));

    return () => {
      entrance?.cancel();
      if (popover && popup.matches(":popover-open")) popup.hidePopover();
      const remaining = (described.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((value) => value && value !== id);
      if (remaining.length)
        described.setAttribute("aria-describedby", remaining.join(" "));
      else described.removeAttribute("aria-describedby");
    };
  }, [note, id]);

  return note
    ? createPortal(
        <div
          ref={popupRef}
          id={id}
          role="tooltip"
          popover="manual"
          style={{ visibility: "hidden", animation: "none" }}
          className="pointer-events-none fixed inset-auto z-50 m-0 w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-lg border border-gold/35 bg-surface/95 px-2.5 py-2 font-sans text-[0.7rem] leading-relaxed text-ink/80 shadow-xl"
        >
          {note.title && (
            <span className="mb-1 block font-display font-semibold tracking-wide text-gold">
              {note.title}
            </span>
          )}
          <span className="block whitespace-pre-wrap wrap-anywhere">
            {note.text}
          </span>
        </div>,
        note.anchor.closest("dialog") ?? document.body,
      )
    : null;
}

"use client";

import { useEffect, useRef } from "react";

export default function FogBrushPreview({
  size,
  scale,
  canSweep,
  brush,
  frameRef,
  pointAt,
}) {
  const ringRef = useRef(null);
  const pointer = useRef(null);
  const previous = useRef(size);
  const locate = useRef(pointAt);
  useEffect(() => {
    locate.current = pointAt;
  });

  useEffect(() => {
    if (!canSweep) return;
    const ring = ringRef.current;
    let preview = previous.current !== size;
    previous.current = size;

    function follow(event) {
      if (event)
        pointer.current = { clientX: event.clientX, clientY: event.clientY };
      const at = pointer.current;
      const box = frameRef.current.getBoundingClientRect();
      const inside =
        at &&
        at.clientX >= box.left &&
        at.clientX <= box.right &&
        at.clientY >= box.top &&
        at.clientY <= box.bottom &&
        locate.current(at);
      const tracking = brush && inside;
      ring.style.visibility = tracking || preview ? "visible" : "hidden";
      ring.style.left = tracking ? `${at.clientX - box.left}px` : "50%";
      ring.style.top = tracking ? `${at.clientY - box.top}px` : "50%";
    }

    function leave(event) {
      if (event.relatedTarget === null) {
        pointer.current = null;
        follow();
      }
    }

    const reposition = () => follow();

    follow();
    const timer = preview
      ? setTimeout(() => {
          preview = false;
          follow();
        }, 1500)
      : null;
    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerdown", follow);
    document.addEventListener("pointerout", leave);
    window.addEventListener("scroll", reposition, true);
    const observer = new ResizeObserver(reposition);
    observer.observe(frameRef.current);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerdown", follow);
      document.removeEventListener("pointerout", leave);
      window.removeEventListener("scroll", reposition, true);
      observer.disconnect();
    };
  }, [size, scale, brush, canSweep, frameRef]);

  if (!canSweep) return null;
  return (
    <span
      ref={ringRef}
      aria-hidden="true"
      className={`pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed ${brush === "hide" ? "border-ruby bg-ruby/10" : "border-gold/80 bg-gold/10"}`}
      style={{ width: `${size * 2 * scale}%`, visibility: "hidden" }}
    />
  );
}

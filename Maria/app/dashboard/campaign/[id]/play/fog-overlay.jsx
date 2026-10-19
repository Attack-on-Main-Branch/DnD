"use client";

import { useEffect, useRef } from "react";
import { createFogRenderer, FOG_TRANSITION_MS } from "@/lib/fog-renderer";

const DM_OPACITY = 0.72;
const FRAME_MS = 1000 / 30;

export default function FogOverlay({
  maskRef,
  subscribe,
  seeThrough,
  enabled = true,
  style,
}) {
  const hostRef = useRef(null);
  const enabledRef = useRef(enabled);
  const redrawRef = useRef(null);

  useEffect(() => {
    enabledRef.current = enabled;
    redrawRef.current?.();
  }, [enabled]);

  useEffect(() => {
    const renderer = createFogRenderer(hostRef.current, seeThrough);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = null;
    let lastFrame = 0;
    let dirty = false;
    let transitioning = false;

    function tick(now) {
      frame = null;
      if (dirty || now - lastFrame >= FRAME_MS) {
        transitioning = renderer.draw(motion.matches ? 0 : now / 1000, now);
        lastFrame = now;
        dirty = false;
      }
      schedule();
    }

    function schedule() {
      if (
        frame === null &&
        !document.hidden &&
        (dirty || (enabledRef.current && (transitioning || !motion.matches)))
      ) {
        frame = requestAnimationFrame(tick);
      }
    }

    function update(change) {
      const mask = maskRef.current;
      if (!mask) return;
      renderer.update(mask, {
        ...change,
        immediate: seeThrough || motion.matches || Boolean(change?.immediate),
      });
      dirty = true;
      schedule();
    }

    function resume() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      dirty = true;
      schedule();
    }

    function changeMotion() {
      if (motion.matches) update({ immediate: true });
      resume();
    }

    update();
    redrawRef.current = resume;
    const unsubscribe = subscribe(update);
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", changeMotion);
    return () => {
      unsubscribe();
      redrawRef.current = null;
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", changeMotion);
      renderer.dispose();
    };
  }, [maskRef, seeThrough, subscribe]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      style={style}
    >
      <div
        ref={hostRef}
        className="size-full transition-opacity ease-in-out motion-reduce:transition-none"
        style={{
          opacity: enabled ? (seeThrough ? DM_OPACITY : 1) : 0,
          transitionDuration: `${FOG_TRANSITION_MS}ms`,
        }}
      />
    </div>
  );
}

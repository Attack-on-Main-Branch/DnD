"use client";

import { useEffect, useRef } from "react";
import {
  createFogRenderer,
  createFramedFogMask,
  FOG_TRANSITION_MS,
} from "@/lib/fog-renderer";

const DM_OPACITY = 0.72;
const FRAME_MS = 1000 / 30;

export default function FogOverlay({
  maskRef,
  subscribe,
  seeThrough,
  enabled = true,
  coverOnLoad = false,
  style,
  frameRatio,
}) {
  const hostRef = useRef(null);
  const enabledRef = useRef(enabled);
  const redrawRef = useRef(null);
  const framed = frameRatio !== undefined;

  useEffect(() => {
    enabledRef.current = enabled;
    redrawRef.current?.();
  }, [enabled]);

  useEffect(() => {
    const renderer = createFogRenderer(hostRef.current, seeThrough);
    const host = hostRef.current;
    const pad = framed ? createFramedFogMask() : null;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = null;
    let lastFrame = 0;
    let dirty = false;
    let transitioning = false;
    let covered = coverOnLoad;

    function tick(now) {
      frame = null;
      if (dirty || now - lastFrame >= FRAME_MS) {
        transitioning = renderer.draw(motion.matches ? 0 : now / 1000, now);
        if (covered && maskRef.current) {
          host.removeAttribute("data-fog-pending");
          covered = false;
        }
        lastFrame = now;
        dirty = false;
      }
      schedule();
    }

    function schedule() {
      if (
        frame === null &&
        !document.hidden &&
        (dirty ||
          ((framed || enabledRef.current) &&
            (transitioning || !motion.matches)))
      ) {
        frame = requestAnimationFrame(tick);
      }
    }

    function update(change) {
      const source = maskRef.current;
      const mask = pad
        ? pad(
            source,
            host.clientWidth,
            host.clientHeight,
            frameRatio,
            enabledRef.current,
          )
        : source;
      if (!mask) return;
      renderer.update(mask, {
        ...(framed ? null : change),
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
    redrawRef.current = framed ? () => update() : resume;
    const unsubscribe = subscribe(update);
    const observer = framed
      ? new ResizeObserver(() => update({ immediate: true }))
      : null;
    observer?.observe(host);
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", changeMotion);
    return () => {
      unsubscribe();
      observer?.disconnect();
      redrawRef.current = null;
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", changeMotion);
      renderer.dispose();
    };
  }, [coverOnLoad, framed, frameRatio, maskRef, seeThrough, subscribe]);

  return (
    <div
      aria-hidden="true"
      className={
        framed
          ? "pointer-events-none absolute top-1/2 left-1/2 h-[100cqh] w-[100cqw] -translate-1/2"
          : "pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      }
      style={style}
    >
      <div
        ref={hostRef}
        data-fog-pending={coverOnLoad ? "" : undefined}
        className="size-full transition-opacity ease-in-out data-fog-pending:bg-surface motion-reduce:transition-none"
        style={{
          opacity: framed || enabled ? (seeThrough ? DM_OPACITY : 1) : 0,
          transitionDuration: `${FOG_TRANSITION_MS}ms`,
        }}
      />
    </div>
  );
}

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
    let edgeFog = false;
    let covered = coverOnLoad;

    function draw(now) {
      transitioning = renderer.draw(motion.matches ? 0 : now / 1000, now);
      if (covered && (maskRef.current || !enabledRef.current)) {
        host.removeAttribute("data-fog-pending");
        covered = false;
      }
      lastFrame = now;
      dirty = false;
    }

    function tick(now) {
      frame = null;
      if (dirty || now - lastFrame >= FRAME_MS) draw(now);
      schedule();
    }

    function schedule() {
      if (
        frame === null &&
        !document.hidden &&
        (dirty ||
          transitioning ||
          ((enabledRef.current || edgeFog) && !motion.matches))
      ) {
        frame = requestAnimationFrame(tick);
      }
    }

    function update(change, resizedAt) {
      const source = maskRef.current;
      const padded = pad?.(
        source,
        host.clientWidth,
        host.clientHeight,
        frameRatio,
        !enabledRef.current,
      );
      const mask = pad ? padded?.canvas : source;
      if (!mask) return;
      edgeFog = padded?.edgeFog ?? false;
      renderer.update(
        mask,
        {
          ...(framed ? null : change),
          feathered: edgeFog,
          immediate: seeThrough || motion.matches || Boolean(change?.immediate),
        },
        resizedAt,
      );
      dirty = true;
      // A backing-store resize clears the canvas, so redraw before this layout is painted.
      if (resizedAt !== undefined) draw(resizedAt);
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
    redrawRef.current = () => update();
    const unsubscribe = subscribe(update);
    const observer = framed
      ? new ResizeObserver(() => update({ immediate: true }, performance.now()))
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
          opacity: enabled || frameRatio ? (seeThrough ? DM_OPACITY : 1) : 0,
          transitionDuration: `${FOG_TRANSITION_MS}ms`,
        }}
      />
    </div>
  );
}

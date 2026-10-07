"use client";

import { useEffect, useRef } from "react";
import { createFogTexture } from "@/lib/fog-texture";

const DM_OPACITY = 0.72;
const REVEAL_MS = 650;
const FRAME_MS = 1000 / 30;
const EDGE_SOFTNESS = 0.012;

export default function FogOverlay({
  maskRef,
  subscribe,
  seeThrough,
  enabled = true,
  style,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const displayed = document.createElement("canvas");
    const from = document.createElement("canvas");
    const target = document.createElement("canvas");
    const layers = [canvas, displayed, from, target];
    const view = displayed.getContext("2d");
    const theme = getComputedStyle(canvas);
    const ground = theme.getPropertyValue("--color-surface").trim();
    const texture = createFogTexture(
      theme.getPropertyValue("--color-silver").trim(),
    );
    const clouds = context.createPattern(texture, "repeat");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let started = null;
    let frame = null;
    let lastFrame = 0;
    let ready = false;

    function blend(now) {
      if (started === null) return;
      const fraction = Math.min(1, (now - started) / REVEAL_MS);
      const progress = fraction * fraction * (3 - 2 * fraction);
      view.clearRect(0, 0, displayed.width, displayed.height);
      view.globalAlpha = 1 - progress;
      view.drawImage(from, 0, 0);
      // Add alpha rather than layering it: unchanged openings stay fully clear.
      view.globalCompositeOperation = "lighter";
      view.globalAlpha = progress;
      view.drawImage(target, 0, 0);
      view.globalAlpha = 1;
      view.globalCompositeOperation = "source-over";
      if (fraction === 1) started = null;
    }

    function draw(now) {
      blend(now);
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      context.fillStyle = ground;
      context.fillRect(0, 0, width, height);
      const time = motion.matches ? 0 : now / 1000;
      for (let layer = 0; layer < 2; layer += 1) {
        const span = width * (layer === 0 ? 1.2 : 0.75);
        const direction = layer === 0 ? 1 : -1;
        context.save();
        clouds.setTransform(
          new DOMMatrix()
            .translate(
              (time * direction * width * 0.006) % span,
              (time * width * 0.003) % span,
            )
            .scale(span / texture.width),
        );
        context.globalAlpha =
          (layer === 0 ? 0.85 : 0.5) * (seeThrough ? 0.65 : 1);
        context.fillStyle = clouds;
        context.fillRect(0, 0, width, height);
        context.restore();
      }
      context.globalCompositeOperation = "destination-out";
      context.drawImage(displayed, 0, 0);
      context.globalCompositeOperation = "source-over";
    }

    function tick(now) {
      frame = null;
      if (now - lastFrame >= FRAME_MS) {
        draw(now);
        lastFrame = now;
      }
      schedule();
    }

    function schedule() {
      if (
        frame === null &&
        enabled &&
        !document.hidden &&
        (!motion.matches || started !== null)
      )
        frame = requestAnimationFrame(tick);
    }

    function update({ immediate = false } = {}) {
      const mask = maskRef.current;
      if (!mask) return;
      const resized = layers.some(
        (layer) => layer.width !== mask.width || layer.height !== mask.height,
      );
      if (resized) {
        for (const layer of layers) {
          layer.width = mask.width;
          layer.height = mask.height;
        }
      }
      const now = performance.now();
      blend(now);
      const next = target.getContext("2d");
      next.clearRect(0, 0, target.width, target.height);
      next.filter = `blur(${mask.width * EDGE_SOFTNESS}px)`;
      next.drawImage(mask, 0, 0);
      next.filter = "none";
      // Extend the feather into fog without dimming narrow revealed passages.
      next.globalCompositeOperation = "lighter";
      next.drawImage(target, 0, 0);
      next.globalCompositeOperation = "source-over";
      next.drawImage(mask, 0, 0);
      if (
        seeThrough ||
        !enabled ||
        !ready ||
        resized ||
        immediate ||
        motion.matches
      ) {
        view.clearRect(0, 0, displayed.width, displayed.height);
        view.drawImage(target, 0, 0);
        started = null;
      } else {
        const previous = from.getContext("2d");
        previous.clearRect(0, 0, from.width, from.height);
        previous.drawImage(displayed, 0, 0);
        started = now;
      }
      ready = true;
      draw(now);
      schedule();
    }

    function resume() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      if (motion.matches) update({ immediate: true });
      else if (!document.hidden) {
        draw(performance.now());
        schedule();
      }
    }

    update({ immediate: true });
    const unsubscribe = subscribe(update);
    document.addEventListener("visibilitychange", resume);
    motion.addEventListener("change", resume);
    return () => {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
      motion.removeEventListener("change", resume);
    };
  }, [enabled, maskRef, seeThrough, subscribe]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="size-full transition-opacity ease-in-out motion-reduce:transition-none"
        style={{
          opacity: enabled ? (seeThrough ? DM_OPACITY : 1) : 0,
          transitionDuration: `${REVEAL_MS}ms`,
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

/**
 * The darkness, drawn over the picture.
 *
 * Filled black and then punched through by the mask — `destination-out` — which
 * is the brush's own operation from the other side, so what was painted and what
 * is seen cannot disagree.
 *
 * At the MASK's size, not the map's: CSS stretches it, exactly as
 * hex-grid-overlay.jsx lets the browser scale a `viewBox`.
 *
 * Two strengths. A player gets pitch black; whoever is running the fight gets
 * the same shape at a fraction of it, or they cannot aim a brush at a corridor
 * they cannot see.
 *
 * Redraws by SUBSCRIBING rather than rendering: the pixels are a ref and a
 * stroke is thirty changes a second. See use-fog.js.
 */

/** How much of the dark the head of the table is left looking through. */
const DM_OPACITY = 0.62;

export default function FogOverlay({ maskRef, subscribe, seeThrough, style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    function draw() {
      const mask = maskRef.current;

      if (!mask) {
        return;
      }

      /* Assigning either dimension also clears the canvas, so this guard is not
         an optimisation: without it a redraw wipes what it is about to paint. */
      if (canvas.width !== mask.width || canvas.height !== mask.height) {
        canvas.width = mask.width;
        canvas.height = mask.height;
      }

      const context = canvas.getContext("2d");

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = seeThrough ? DM_OPACITY : 1;
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvas.width, canvas.height);

      /* Back to full strength before the punch: `destination-out` removes as
         much as the source is opaque, so a half-transparent eraser would leave a
         quarter of the dark standing where the light is supposed to be. */
      context.globalAlpha = 1;
      context.globalCompositeOperation = "destination-out";
      context.drawImage(mask, 0, 0);
      context.globalCompositeOperation = "source-over";
    }

    draw();

    return subscribe(draw);
  }, [maskRef, seeThrough, subscribe]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      style={style}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}

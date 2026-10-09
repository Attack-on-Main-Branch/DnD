"use client";

import { useEffect, useRef } from "react";
import { createRenderer } from "./animation/renderer.js";
import { createTint } from "./animation/tint.js";
import { registerTint } from "./tint-control";
import "./paths-background.css";

const TINT_ID = "paths-battle-tint";

/**
 * Full-viewport animated background. React owns the DOM and nothing else: the
 * animation lives in an imperative renderer driven by refs, so it never
 * triggers a re-render.
 */
export default function PathsBackground() {
  const hostRef = useRef(null);
  const bloomRef = useRef(null);
  // Two trail buffers: a dissolve is a whole-layer operation, and an
  // overlapping launch has both generations on screen at once.
  const trailARef = useRef(null);
  const trailBRef = useRef(null);
  const dustRef = useRef(null);
  const redRef = useRef(null);
  const greenRef = useRef(null);
  const blueRef = useRef(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer = null;

    const boot = () => {
      renderer?.destroy();
      renderer = createRenderer({
        host: hostRef.current,
        bloom: bloomRef.current,
        trails: [trailARef.current, trailBRef.current],
        dust: dustRef.current,
        reducedMotion: query.matches,
      });
      renderer.start();
    };

    boot();
    query.addEventListener("change", boot);

    return () => {
      query.removeEventListener("change", boot);
      renderer?.destroy();
    };
  }, []);

  // Apart from the renderer, so a reduced-motion reboot does not snap a fight
  // back to gold.
  useEffect(() => {
    const tint = createTint({
      host: hostRef.current,
      red: redRef.current,
      green: greenRef.current,
      blue: blueRef.current,
      reference: `url(#${TINT_ID})`,
    });
    const unregister = registerTint(tint);

    return () => {
      unregister();
      tint.destroy();
    };
  }, []);

  return (
    <>
      <div className="paths" ref={hostRef} aria-hidden="true">
        <canvas className="paths__layer paths__layer--bloom" ref={bloomRef} />
        <canvas className="paths__layer paths__layer--trail" ref={trailARef} />
        <canvas className="paths__layer paths__layer--trail" ref={trailBRef} />
        <canvas className="paths__layer paths__layer--dust" ref={dustRef} />
        <div className="paths__vignette" />
        <div className="paths__grain" />
      </div>

      {/* The tint's curve, beside the background rather than inside the
          element it colours. `sRGB` because the exponents in tint.js were
          chosen against the colours as written in palette.js. */}
      <svg className="paths__defs" aria-hidden="true" focusable="false">
        <filter id={TINT_ID} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR ref={redRef} type="gamma" exponent="1" />
            <feFuncG ref={greenRef} type="gamma" exponent="1" />
            <feFuncB ref={blueRef} type="gamma" exponent="1" />
          </feComponentTransfer>
        </filter>
      </svg>
    </>
  );
}

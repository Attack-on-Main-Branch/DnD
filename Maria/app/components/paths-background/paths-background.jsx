"use client";

import { useEffect, useRef } from "react";
import { createRenderer } from "./animation/renderer.js";
import "./paths-background.css";

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

  return (
    <div className="paths" ref={hostRef} aria-hidden="true">
      <canvas className="paths__layer paths__layer--bloom" ref={bloomRef} />
      <canvas className="paths__layer paths__layer--trail" ref={trailARef} />
      <canvas className="paths__layer paths__layer--trail" ref={trailBRef} />
      <canvas className="paths__layer paths__layer--dust" ref={dustRef} />
      <div className="paths__vignette" />
      <div className="paths__grain" />
    </div>
  );
}

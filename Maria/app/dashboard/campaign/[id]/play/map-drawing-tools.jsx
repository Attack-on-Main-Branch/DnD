"use client";

import { useEffect, useState } from "react";
import { CONE_ANGLES, MAP_DRAWING_SHAPES } from "sina/rules/map-drawing";

import { surfaceClasses } from "@/app/components/ui/surface";
import { TABLE_CONTROLS_AT } from "./entrance";

const LABELS = { arrow: "Arrow", circle: "Circle", cone: "Cone" };

export function MapControlTray({ shown, children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), TABLE_CONTROLS_AT);
    return () => clearTimeout(timer);
  }, []);

  const visible = shown && ready;
  return (
    <div
      inert={!visible || undefined}
      aria-hidden={!visible || undefined}
      className={`tray-fold motion-reduce:transition-none ${visible ? "" : "tray-folded"}`}
    >
      <div className="dice-slot-under fold-body">
        <div
          data-away={!visible ? "" : undefined}
          data-tuck="down"
          className="dice-capsule dice-capsule-under pointer-events-auto flex flex-wrap items-end justify-center gap-3"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MapDrawingTools({ shape, angle, onShape, onAngle }) {
  return (
    <div
      role="group"
      aria-label="Map drawing tools"
      className={surfaceClasses({
        className: "flex shrink-0 items-center rounded-xl px-3 py-2",
      })}
    >
      <div
        role="group"
        aria-label="Drawing shape"
        className="flex items-center gap-2"
      >
        {MAP_DRAWING_SHAPES.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Draw ${LABELS[value].toLowerCase()}`}
            aria-pressed={shape === value}
            onClick={() => onShape(value)}
            className={controlClasses(shape === value)}
          >
            <DrawingIcon shape={value} />
          </button>
        ))}
      </div>
      <div
        inert={shape !== "cone" || undefined}
        aria-hidden={shape !== "cone" || undefined}
        className={`grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-tray motion-reduce:transition-none ${shape === "cone" ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"}`}
      >
        <div className="min-w-0 overflow-hidden">
          <div
            role="group"
            aria-label="Cone angle"
            className="ml-2 flex gap-2 border-l border-gold/20 pl-2"
          >
            {CONE_ANGLES.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} degree cone`}
                aria-pressed={angle === value}
                onClick={() => onAngle(value)}
                className={controlClasses(angle === value)}
              >
                {value}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function controlClasses(selected) {
  return `flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-xs transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none ${selected ? "bg-gold/15 text-gold shadow-[inset_0_0_0_1px_var(--gold-40)]" : "text-ink/60 hover:bg-gold/10 hover:text-gold"}`;
}

function DrawingIcon({ shape }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-6"
    >
      {shape === "arrow" ? (
        <path d="M5 19 19 5M8 5h11v11" />
      ) : shape === "circle" ? (
        <circle cx="12" cy="12" r="8" />
      ) : (
        <path d="M12 3 3 19a18 18 0 0 0 18 0L12 3Z" />
      )}
    </svg>
  );
}

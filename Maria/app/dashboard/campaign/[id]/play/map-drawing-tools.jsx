"use client";

import { useEffect, useState } from "react";
import {
  CONE_ANGLES,
  MAP_DRAWING_SHAPES,
  SEMICIRCLE_ANGLE,
} from "sina/rules/map-drawing";

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
      className={`tray-fold motion-reduce:transition-none max-sm:w-full max-sm:min-w-0 ${visible ? "" : "tray-folded"}`}
    >
      <div className="dice-slot-under fold-body max-sm:w-full max-sm:min-w-0">
        <div
          data-away={!visible ? "" : undefined}
          data-tuck="down"
          className="dice-capsule dice-capsule-under pointer-events-auto flex flex-wrap items-end justify-center gap-3 max-sm:w-full max-sm:min-w-0"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function MapDrawingTools({
  shape,
  angle,
  onShape,
  onAngle,
  phone = false,
}) {
  return (
    <div
      role="group"
      aria-label="Map drawing tools"
      className={surfaceClasses({
        className: phone
          ? "flex w-full flex-wrap items-center justify-center gap-x-2 rounded-xl px-1 py-0.5"
          : "flex shrink-0 items-center rounded-xl px-3 py-2 max-sm:max-w-full max-sm:flex-col max-sm:gap-y-2",
      })}
    >
      <div
        role="group"
        aria-label="Drawing shape"
        className={
          phone
            ? "flex items-center justify-center gap-1"
            : "flex items-center gap-2"
        }
      >
        {MAP_DRAWING_SHAPES.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Draw ${LABELS[value].toLowerCase()}`}
            aria-pressed={shape === value}
            onClick={() => onShape(value)}
            className={controlClasses(shape === value, phone)}
          >
            <DrawingIcon shape={value} />
          </button>
        ))}
      </div>
      <div
        inert={shape !== "cone" || undefined}
        aria-hidden={shape !== "cone" || undefined}
        className={
          phone
            ? shape === "cone"
              ? "min-w-0"
              : "hidden"
            : `grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-tray motion-reduce:transition-none max-sm:grid-cols-1 max-sm:transition-[grid-template-rows,opacity] ${shape === "cone" ? "grid-cols-[1fr] opacity-100 max-sm:grid-rows-[1fr]" : "grid-cols-[0fr] opacity-0 max-sm:grid-rows-[0fr]"}`
        }
      >
        <div className="min-w-0 overflow-hidden max-sm:min-h-0">
          <div
            role="group"
            aria-label="Cone angle"
            className={
              phone
                ? "flex items-center justify-center gap-0.5"
                : "ml-2 flex gap-2 border-l border-gold/20 pl-2 max-sm:ml-0 max-sm:border-l-0 max-sm:pl-0"
            }
          >
            {CONE_ANGLES.filter(
              (value) => phone || value !== SEMICIRCLE_ANGLE,
            ).map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} degree cone`}
                aria-pressed={angle === value}
                onClick={() => onAngle(value)}
                className={controlClasses(angle === value, phone)}
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

function controlClasses(selected, phone) {
  return `flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-xs transition-[color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none max-sm:touch-manipulation ${phone ? "h-10 w-9" : "size-9 max-sm:size-11"} ${selected ? "bg-gold/15 text-gold shadow-[inset_0_0_0_1px_var(--gold-40)]" : "text-ink/60 hover:bg-gold/10 hover:text-gold"}`;
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

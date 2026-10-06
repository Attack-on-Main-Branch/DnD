"use client";

import { useEffect, useRef, useState } from "react";
import { normaliseFacing, SCENE_FIELD_OF_VIEW } from "sina/rules/scene";

import SceneMark from "@/app/components/ui/scene-mark";

/**
 * The camera on the Dungeon Master's board: the mark where it stands, the wedge
 * of what it sees, and a handle at the wedge's tip to aim it. Drag the mark to
 * move it, the handle to turn it. Written on release.
 *
 * NOTHING HERE ANNOUNCES ITSELF. It never goes through the board's carried-piece
 * hand, whose arrows every chair is told about.
 */

/** How far the wedge reaches, as a share of the picture's shorter side. */
const REACH = 0.3;

export default function SceneCamera({
  camera,
  natural,
  scale,
  layerStyle,
  pointAt,
  onPaint,
  onCommit,
}) {
  const markRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const latest = useRef(null);

  useEffect(() => {
    latest.current = { camera, pointAt, onPaint, onCommit };
  });

  useEffect(() => {
    if (!drag) {
      return undefined;
    }

    function follow(event) {
      const { pointAt: at, onPaint: paint } = latest.current;

      if (drag === "move") {
        const point = at(event);

        if (point) {
          paint({ x: point.x, y: point.y });
        }

        return;
      }

      // Screen space: the board scales evenly, so the angle is the picture's.
      const box = markRef.current?.getBoundingClientRect();

      if (box) {
        const facing = normaliseFacing(
          (Math.atan2(
            event.clientX - (box.left + box.width / 2),
            -(event.clientY - (box.top + box.height / 2)),
          ) *
            180) /
            Math.PI,
        );

        paint({ facing });
      }
    }

    function release() {
      const { camera: standing, onCommit: commit } = latest.current;

      commit({ x: standing.x, y: standing.y, facing: standing.facing });
      setDrag(null);
    }

    document.addEventListener("pointermove", follow);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);

    return () => {
      document.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, [drag]);

  if (!natural) {
    return null;
  }

  const { width, height } = natural;
  const reach = Math.min(width, height) * REACH;
  const cx = camera.x * width;
  const cy = camera.y * height;

  const towards = (offset) => {
    const angle = ((camera.facing + offset) * Math.PI) / 180;

    return { x: cx + Math.sin(angle) * reach, y: cy - Math.cos(angle) * reach };
  };

  const left = towards(-SCENE_FIELD_OF_VIEW / 2);
  const right = towards(SCENE_FIELD_OF_VIEW / 2);
  const tip = towards(0);

  function grab(kind) {
    return (event) => {
      if (event.button !== 0 || !event.isPrimary) {
        return;
      }

      // Or the board takes the press as the start of a pan.
      event.stopPropagation();
      event.preventDefault();
      setDrag(kind);
    };
  }

  const counter = `translate(-50%, -50%) scale(${1 / scale})`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={layerStyle}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <polygon
          points={`${cx},${cy} ${left.x},${left.y} ${right.x},${right.y}`}
          fill="var(--color-gold)"
          fillOpacity="0.2"
          stroke="var(--color-gold)"
          strokeOpacity="0.7"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={cx}
          y1={cy}
          x2={tip.x}
          y2={tip.y}
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span
        className={`pointer-events-auto absolute grid size-6 place-items-center rounded-full border-2 border-gold bg-surface/85 shadow-[0_0_8px_var(--gold-70)] ${
          drag === "aim" ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: `${(tip.x / width) * 100}%`,
          top: `${(tip.y / height) * 100}%`,
          transform: counter,
        }}
        onPointerDown={grab("aim")}
        title="Drag to aim the camera"
      />

      <span
        ref={markRef}
        className={`pointer-events-auto absolute grid size-11 place-items-center rounded-full border border-gold/60 bg-surface/90 text-gold shadow-[0_0_12px_rgba(0,0,0,0.9)] ${
          drag === "move" ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          left: `${camera.x * 100}%`,
          top: `${camera.y * 100}%`,
          transform: counter,
        }}
        onPointerDown={grab("move")}
        title="Drag to move the camera"
      >
        <SceneMark className="size-7" />
      </span>
    </div>
  );
}

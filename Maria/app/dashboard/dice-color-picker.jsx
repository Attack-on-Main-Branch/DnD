"use client";

import { useState } from "react";
import { readDiceColor } from "sina/rules/character";

import {
  CHOICE_CARD_FOCUS_CLASSES,
  controlClasses,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";

import { DICE_COLOR_PRESETS } from "./character-presentation";

/**
 * Any colour at all: a saturation-and-brightness field, a hue bar under it,
 * and beside them the twelve the sheet used to offer as quick picks and the
 * hex for typing one in.
 *
 * HUE IS HELD HERE rather than re-read from the hex each time, because a grey
 * has none: dragging to the field's edge would otherwise throw the hue away and
 * snap the bar back to red.
 */
export default function DiceColorPicker({ value, onChange, disabled }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [held, setHeld] = useState(value);
  const [draft, setDraft] = useState(null);

  // Changed from outside — a preset, a save, a reset — and not by this picker.
  if (value !== held) {
    setHeld(value);
    setHsv(hexToHsv(value));
  }

  function choose(next) {
    const hex = hsvToHex(next);

    setHsv(next);
    setHeld(hex);
    onChange(hex);
  }

  function type(text) {
    setDraft(text);

    const hex = readDiceColor(`#${text.replace(/^#/, "")}`);

    if (hex) {
      setHeld(hex);
      setHsv(hexToHsv(hex));
      onChange(hex);
    }
  }

  const hue = `hsl(${Math.round(hsv.h)} 100% 50%)`;

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className={LABEL_CLASSES}>Dice colour</legend>

      <div className="mt-1.5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-3">
          <Pad
            label="Saturation and brightness"
            valueText={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
            x={hsv.s}
            y={1 - hsv.v}
            disabled={disabled}
            onMove={(x, y) => choose({ ...hsv, s: x, v: 1 - y })}
            className="h-32 rounded-lg"
            style={{
              backgroundColor: hue,
              backgroundImage:
                "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
            }}
            thumb={value}
          />

          <Pad
            label="Hue"
            valueText={`Hue ${Math.round(hsv.h)} degrees`}
            x={hsv.h / 360}
            disabled={disabled}
            onMove={(x) => choose({ ...hsv, h: Math.min(x * 360, 359.9) })}
            className="h-3.5 rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
            }}
            thumb={hue}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 sm:w-44">
          <div className="grid grid-cols-6 justify-items-center gap-1.5 sm:gap-2">
            {DICE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                title={preset.label}
                aria-label={preset.label}
                aria-pressed={value === preset.hex}
                onClick={() => {
                  setDraft(null);
                  onChange(preset.hex);
                }}
                className={`size-6 cursor-pointer rounded-full transition duration-300 ${CHOICE_CARD_FOCUS_CLASSES} ${
                  value === preset.hex
                    ? "ring-2 ring-gold shadow-[0_0_8px_var(--gold-60)]"
                    : "ring-1 ring-white/15 hover:ring-gold/50"
                }`}
                style={{ backgroundColor: preset.hex }}
              />
            ))}
          </div>

          <label className="flex items-center gap-2">
            <span className="sr-only">Hex colour</span>
            <span
              aria-hidden="true"
              className="size-9 shrink-0 rounded-lg ring-1 ring-white/20"
              style={{ backgroundColor: value }}
            />
            <span className="relative min-w-0 flex-1">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-ink/45"
              >
                #
              </span>
              <input
                type="text"
                inputMode="text"
                spellCheck={false}
                maxLength={7}
                value={draft ?? value.slice(1)}
                onChange={(event) => type(event.target.value)}
                onBlur={() => setDraft(null)}
                className={controlClasses({
                  className: "w-full pl-6 font-mono uppercase",
                })}
              />
            </span>
          </label>
        </div>
      </div>
    </fieldset>
  );
}

/**
 * A field the pointer drags across and the arrow keys step through: two axes
 * when `y` is given, one when it is not. Positions are fractions of the box.
 */
function Pad({
  label,
  valueText,
  x,
  y,
  disabled,
  onMove,
  className,
  style,
  thumb,
}) {
  const twoAxes = y !== undefined;

  function point(event) {
    const box = event.currentTarget.getBoundingClientRect();

    onMove(
      clamp((event.clientX - box.left) / box.width),
      clamp((event.clientY - box.top) / box.height),
    );
  }

  function step(event) {
    const by = event.shiftKey ? 0.1 : 0.01;
    const moves = {
      ArrowLeft: [-by, 0],
      ArrowRight: [by, 0],
      ArrowUp: [0, -by],
      ArrowDown: [0, by],
    };
    let [dx, dy] = moves[event.key] ?? [];

    if (dx === undefined) {
      return;
    }

    event.preventDefault();

    // One axis: up and down move it too, the way a native slider does.
    if (!twoAxes) {
      dx = dx || -dy;
      dy = 0;
    }

    onMove(clamp(x + dx), clamp((y ?? 0) + dy));
  }

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuetext={valueText}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(x * 100)}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) {
          return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        point(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          point(event);
        }
      }}
      onKeyDown={disabled ? undefined : step}
      className={`relative w-full touch-none ring-1 ring-gold/20 outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"
      } ${className}`}
      style={style}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.6)]"
        style={{
          left: `${x * 100}%`,
          top: twoAxes ? `${y * 100}%` : "50%",
          backgroundColor: thumb,
        }}
      />
    </div>
  );
}

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

function hexToHsv(hex) {
  const value = parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const span = max - Math.min(r, g, b);

  let h = 0;

  if (span) {
    if (max === r) {
      h = ((g - b) / span) % 6;
    } else if (max === g) {
      h = (b - r) / span + 2;
    } else {
      h = (r - g) / span + 4;
    }
  }

  return { h: (h * 60 + 360) % 360, s: max ? span / max : 0, v: max };
}

function hsvToHex({ h, s, v }) {
  const channel = (n) => {
    const k = (n + h / 60) % 6;
    const level = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));

    return Math.round(level * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${channel(5)}${channel(3)}${channel(1)}`;
}

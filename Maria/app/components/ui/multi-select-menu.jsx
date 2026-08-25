"use client";

import { useEffect, useId, useRef, useState } from "react";

import { controlClasses, LABEL_CLASSES } from "./field-styles";
import { CheckIcon, ChevronIcon } from "./select-menu";
import { surfaceClasses } from "./surface";

/**
 * select-menu.jsx with ONE RULE CHANGED: a row toggles instead of choosing, and
 * the menu stays open while it does. Everything else is that control's, down to
 * the chevron and the tick.
 *
 * No hidden input: nothing that uses this posts a form.
 *
 * `everything` is the row at the top that takes them all at once. It belongs
 * inside the list rather than beside it — it is one more way to answer the same
 * question.
 */
export default function MultiSelectMenu({
  label,
  options,
  value,
  onChange,
  everything,
  disabled = false,
  placeholder = "Nobody yet",
}) {
  const labelId = useId();
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const chosen = value ?? [];

  /* Index 0 when offered, so the keyboard walks the list the pointer sees. */
  const rows = everything
    ? [{ value: null, label: everything }, ...options]
    : options;

  const all = options.length > 0 && chosen.length === options.length;

  // pointerdown rather than click: a press starting outside dismisses at once,
  // instead of waiting for a release that may never land on the same element.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) {
      return;
    }

    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  /** One row toggled, and the menu LEFT OPEN — the point of the control. */
  function toggle(index) {
    const row = rows[index];

    if (!row) {
      return;
    }

    if (row.value === null) {
      onChange(all ? [] : options.map((option) => option.value));
      return;
    }

    onChange(
      chosen.includes(row.value)
        ? chosen.filter((one) => one !== row.value)
        : [...chosen, row.value],
    );
  }

  function openMenu() {
    setActiveIndex(0);
    setOpen(true);
  }

  function handleKeyDown(event) {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (open) {
          setActiveIndex((current) => Math.min(current + 1, rows.length - 1));
        } else {
          openMenu();
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (open) {
          setActiveIndex((current) => Math.max(current - 1, 0));
        } else {
          openMenu();
        }
        break;

      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;

      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(rows.length - 1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          toggle(activeIndex);
        } else {
          openMenu();
        }
        break;

      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;

      case "Tab":
        setOpen(false);
        break;

      default:
        break;
    }
  }

  /** The names while they fit, a count once they do not. */
  const summary = () => {
    if (chosen.length === 0) {
      return null;
    }

    if (all && everything) {
      return everything;
    }

    const named = chosen
      .map((id) => options.find((option) => option.value === id)?.label)
      .filter(Boolean);

    return named.length <= 2
      ? named.join(", ")
      : `${named.length} of ${options.length}`;
  };

  const said = summary();

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <span id={labelId} className={LABEL_CLASSES}>
        {label}
      </span>

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={labelId}
          // Focus stays on the trigger while arrowing, so this is what tells a
          // screen reader which row is currently highlighted.
          aria-activedescendant={
            open ? `${listboxId}-option-${activeIndex}` : undefined
          }
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          className={`${controlClasses()} flex items-center justify-between gap-2 text-left`}
        >
          <span className={said ? "truncate" : "truncate text-ink/50"}>
            {said ?? placeholder}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            aria-multiselectable="true"
            tabIndex={-1}
            className={surfaceClasses({
              variant: "solid",
              className:
                "scroll-gold absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg p-1",
            })}
          >
            {rows.map((row, index) => {
              const isSelected =
                row.value === null ? all : chosen.includes(row.value);
              const isActive = index === activeIndex;

              return (
                <li key={row.value ?? "everything"}>
                  {/*
                    A native option is not focusable, and neither is this:
                    focus stays on the trigger while aria-activedescendant
                    highlighting tracks the keyboard. Pointer users get hover.
                  */}
                  <div
                    role="option"
                    id={`${listboxId}-option-${index}`}
                    aria-selected={isSelected}
                    data-index={index}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      toggle(index);
                    }}
                    onPointerEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                      isActive ? "bg-gold/10 text-gold" : "text-ink"
                    } ${row.value === null ? "font-display tracking-wide" : ""}`}
                  >
                    {row.label}
                    {isSelected && <CheckIcon />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

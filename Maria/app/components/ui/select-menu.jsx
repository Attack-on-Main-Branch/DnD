"use client";

import { useEffect, useId, useRef, useState } from "react";

import { controlClasses, LABEL_CLASSES } from "./field-styles";

/**
 * Styled single-choice dropdown, replacing the native <select>.
 *
 * The native control could not be themed: a browser renders <option> rows with
 * the operating system's own popup, so the dark-mode text colour carried over
 * onto a white system background and the list came out invisible. Everything
 * here is app-owned markup, so it is styled and readable in both themes.
 *
 * Implements the ARIA listbox pattern: the trigger is a button, the list is a
 * listbox, and the chosen value rides along in a hidden input so it submits
 * with the surrounding form exactly like a <select> would.
 */
export default function SelectMenu({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = "Select…",
  describedBy,
}) {
  const labelId = useId();
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  // Pointer presses outside the component close it. Listening for pointerdown
  // rather than click means a press that starts outside dismisses immediately,
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

  function openMenu(startIndex = selectedIndex >= 0 ? selectedIndex : 0) {
    setActiveIndex(startIndex);
    setOpen(true);
  }

  function commit(index) {
    const option = options[index];

    if (option) {
      onChange(option.value);
    }

    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((current) => Math.min(current + 1, options.length - 1));
        }
        break;

      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openMenu();
        } else {
          setActiveIndex((current) => Math.max(current - 1, 0));
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
          setActiveIndex(options.length - 1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        if (open) {
          commit(activeIndex);
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

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <span id={labelId} className={LABEL_CLASSES}>
        {label}
      </span>

      {/* Carries the value to the server so the form posts like a native select. */}
      <input type="hidden" name={name} value={value ?? ""} />

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
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          className={`${controlClasses({ invalid })} flex items-center justify-between gap-2 text-left`}
        >
          <span className={selected ? "" : "text-neutral-400"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronIcon open={open} />
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-black/10 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-neutral-900"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;

              return (
                <li key={option.value}>
                  {/*
                    A native option is not focusable, and neither is this: focus
                    stays on the trigger while aria-activedescendant-style
                    highlighting tracks the keyboard. Pointer users get hover.
                  */}
                  <div
                    role="option"
                    id={`${listboxId}-option-${index}`}
                    aria-selected={isSelected}
                    data-index={index}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      commit(index);
                    }}
                    onPointerEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                        : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {option.label}
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

function ChevronIcon({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

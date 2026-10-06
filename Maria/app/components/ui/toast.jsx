"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { surfaceClasses } from "./surface";

/**
 * Somewhere for a refusal to go when the control that caused it has already
 * closed — and, with `tone: "done"`, for a long job that finished after its
 * drawer shut.
 *
 * Every other rejection in this app is drawn beside the field that produced it,
 * which is right for a form: the sheet is still open and the problem is a thing
 * to fix where you stand. The table is the case that does not fit — a deed there
 * paints at once and lets the write follow, so by the time the database refuses,
 * the drawer has shut and the bar has already moved.
 */

const RESTING = { show: () => {} };

const ToastContext = createContext(RESTING);

/** How long a message stands before it goes on its own. */
const TOAST_MS = 6000;

/** Older ones step aside rather than stacking off the bottom of the window. */
const MAX_TOASTS = 3;

const TONES = {
  refusal: {
    title: "Not written",
    rim: "border-l-red-400/80",
    heading: "text-red-300",
    role: "alert",
  },
  done: {
    title: "Done",
    rim: "border-l-emerald-400",
    heading: "text-emerald-300",
    role: "status",
  },
};

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const next = useRef(0);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((standing) => standing.filter((one) => one.id !== id));
  }, []);

  const show = useCallback((message, { tone = "refusal", title } = {}) => {
    const body = String(message ?? "").trim();

    if (!body) {
      return;
    }

    const id = ++next.current;

    setToasts((standing) =>
      [...standing, { id, body, tone, title }].slice(-MAX_TOASTS),
    );

    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        setToasts((standing) => standing.filter((one) => one.id !== id));
      }, TOAST_MS),
    );
  }, []);

  useEffect(() => {
    const pending = timers.current;

    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }

      pending.clear();
    };
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* `fixed` and out of the table's grid entirely: the board clips both its
          axes, so anything laid over it from inside would be cut off. The stack
          takes no pointer events; each message turns them back on for itself. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }) {
  const tone = TONES[toast.tone] ?? TONES.refusal;

  return (
    <div
      role={tone.role}
      className={surfaceClasses({
        variant: "solid",
        className:
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl " +
          `border-l-4 ${tone.rim} px-4 py-3 ` +
          "motion-safe:animate-[float-up_0.25s_var(--ease-tray)]",
      })}
    >
      {tone === TONES.done && <DoneMark />}

      <div className="min-w-0 flex-1">
        <p
          className={`font-display text-[11px] font-semibold tracking-[0.16em] uppercase ${tone.heading}`}
        >
          {toast.title ?? tone.title}
        </p>

        <p className="mt-0.5 text-sm text-ink/85">{toast.body}</p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="-mr-1 shrink-0 cursor-pointer rounded-md px-1.5 py-0.5 text-lg leading-none text-ink/45 transition hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
      >
        {/* The multiplication sign, not a letter x. */}
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

function DoneMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 size-6 shrink-0 rounded-full bg-emerald-500/20 p-1 text-emerald-300"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

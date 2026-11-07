"use client";

import { useSyncExternalStore } from "react";

import {
  isPageLoading,
  subscribePageLoading,
} from "../navigation-progress-control";
import "./page-loading.css";

const serverLoading = () => false;
const MARKS = Array.from({ length: 12 }, (_, index) => index * 30);

export default function PageLoadingIndicator() {
  const visible = useSyncExternalStore(
    subscribePageLoading,
    isPageLoading,
    serverLoading,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      data-visible={visible}
      className="page-loading pointer-events-none fixed inset-0 z-40 grid place-items-center text-gold"
    >
      <span className="sr-only">{visible ? "Loading page…" : ""}</span>
      <svg
        aria-hidden="true"
        viewBox="-50 -50 100 100"
        className="page-loading__sigil size-24 sm:size-28"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
      >
        <g className="page-loading__orbit">
          {MARKS.map((angle, index) => (
            <path
              key={angle}
              transform={`rotate(${angle})`}
              d="M0-46 2-40 0-35-2-40Z"
              fill="currentColor"
              opacity={index % 3 === 0 ? 0.85 : 0.3}
            />
          ))}
          <path
            d="M0-33 28.58-16.5 28.58 16.5 0 33-28.58 16.5-28.58-16.5Z"
            opacity="0.25"
          />
        </g>
        <g className="page-loading__rose">
          <path
            d="M0-31 5-12 22-22 12-5 31 0 12 5 22 22 5 12 0 31-5 12-22 22-12 5-31 0-12-5-22-22-5-12Z"
            fill="currentColor"
            fillOpacity="0.08"
            strokeOpacity="0.55"
          />
          <path
            d="M0-31 0-10 5-12ZM31 0 10 0 12 5ZM0 31 0 10-5 12ZM-31 0-10 0-12-5Z"
            fill="currentColor"
            fillOpacity="0.7"
            stroke="none"
          />
          <path d="M0-17 17 0 0 17-17 0Z" opacity="0.45" />
        </g>
        <path d="M0-9 5 0 0 9-5 0Z" fill="currentColor" fillOpacity="0.8" />
        <path d="M0-5V5M-2 0H2" className="text-surface" strokeWidth="1" />
      </svg>
    </div>
  );
}

"use client";

import Link from "next/link";

import { useTableWire } from "./table-wire";

/**
 * The way out, and the one thing it does before it goes.
 *
 * A Next navigation keeps this page mounted until the next one is ready, so the
 * chair was given up only once the dashboard had loaded — nearly three seconds
 * of a card still lit for somebody already gone. Standing up costs one message
 * and happens on the press; the socket is tidied on unmount as before.
 */
export default function LeaveTable({ href, className, slide }) {
  const { leave } = useTableWire();

  function onClick(event) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      leave();
    }
  }

  return (
    <Link
      data-fade
      data-table-arrival-content={slide}
      href={href}
      onClick={onClick}
      className={className}
    >
      ← Leave the table
    </Link>
  );
}

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
export default function LeaveTable({ href, className }) {
  const { leave } = useTableWire();

  return (
    <Link href={href} onClick={leave} className={className}>
      ← Leave the table
    </Link>
  );
}

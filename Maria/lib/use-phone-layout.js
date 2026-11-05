"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(width < 40rem), (pointer: coarse) and (width < 64rem)";
const desktop = () => false;
const read = () => window.matchMedia(QUERY).matches;

function watch(changed) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}

export function usePhoneLayout() {
  return useSyncExternalStore(watch, read, desktop);
}

"use client";

import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { preload } from "react-dom";

import { useReducedMotion } from "@/app/components/use-reduced-motion";
import PageLoading from "@/app/components/ui/page-loading";

import DiceTable from "./dice-table";
import { playTableEntrance } from "./table-page-entrance";
import "./table-page-entrance.css";

const DESKTOP = "(width >= 64rem)";
const PHONE = "(width < 40rem), (pointer: coarse) and (width < 64rem)";
const server = () => null;

function read() {
  if (window.matchMedia(DESKTOP).matches) return "workspace";
  return window.matchMedia(PHONE).matches ? "phone" : "table";
}

function watch(changed) {
  const queries = [DESKTOP, PHONE].map((query) => window.matchMedia(query));
  for (const query of queries) query.addEventListener("change", changed);
  return () => {
    for (const query of queries) query.removeEventListener("change", changed);
  };
}

export default function PhoneTableMode({
  diceProps,
  mapUrl,
  controller,
  desktop,
  children,
}) {
  const viewport = useSyncExternalStore(watch, read, server);
  const reducedMotion = useReducedMotion();
  const table = useRef(null);
  const layout = viewport === "phone" && !controller ? "table" : viewport;

  useLayoutEffect(() => {
    const node = table.current;
    if (node && !node.hasAttribute("data-table-closing")) {
      playTableEntrance(node, true);
    }
  }, [layout, reducedMotion]);

  if (viewport === null) {
    if (mapUrl) preload(mapUrl, { as: "image", fetchPriority: "high" });
    return <PageLoading as="div" />;
  }

  return (
    <div
      key={layout}
      ref={table}
      data-table-arrival={layout}
      className="contents"
    >
      <DiceTable {...diceProps}>
        {layout === "workspace"
          ? desktop
          : layout === "phone"
            ? controller
            : children}
      </DiceTable>
    </div>
  );
}

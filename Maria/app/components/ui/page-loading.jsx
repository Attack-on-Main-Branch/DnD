"use client";

import { useEffect } from "react";

import { registerPageLoading } from "../navigation-progress-control";

export default function PageLoading({ as: Element = "main" }) {
  useEffect(() => registerPageLoading(), []);

  return (
    <Element aria-busy="true" aria-label="Loading page" className="flex-1" />
  );
}

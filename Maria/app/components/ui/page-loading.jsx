"use client";

import { useEffect } from "react";

import { registerPageLoading } from "../navigation-progress-control";

export default function PageLoading() {
  useEffect(() => registerPageLoading(), []);

  return <main aria-busy="true" aria-label="Loading page" className="flex-1" />;
}

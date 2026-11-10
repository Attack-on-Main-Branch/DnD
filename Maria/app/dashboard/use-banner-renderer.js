"use client";

import { useEffect, useRef } from "react";
import { observeBannerRenderer } from "@/lib/banner-motion.mjs";

export default function useBannerRenderer(animated, loadRenderer) {
  const ref = useRef(null);

  useEffect(() => {
    if (!animated) return;
    return observeBannerRenderer(ref.current, loadRenderer);
  }, [animated, loadRenderer]);

  return ref;
}

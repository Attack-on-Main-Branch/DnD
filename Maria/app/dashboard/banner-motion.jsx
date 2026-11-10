"use client";

import { useEffect, useRef } from "react";
import { observeBannerMotion } from "@/lib/banner-motion.mjs";

export default function BannerMotion({
  className,
  style,
  children,
  disabled = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (disabled) return;
    return observeBannerMotion(ref.current);
  }, [disabled]);

  return (
    <span
      ref={ref}
      className={className}
      style={
        disabled
          ? {
              ...style,
              "--banner-play-state": "paused",
              "--banner-will-change": "auto",
            }
          : style
      }
    >
      {children}
    </span>
  );
}

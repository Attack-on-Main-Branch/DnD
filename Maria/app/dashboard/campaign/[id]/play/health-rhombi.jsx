import { useId } from "react";
import { HEALTH_TIERS } from "sina/rules/health";

import { healthBarClass } from "@/app/dashboard/health-presentation";

export default function HealthRhombi({ tier, dead }) {
  const gradient = useId();
  if (!HEALTH_TIERS.includes(tier) && !dead) return null;
  const intact = dead ? 0 : HEALTH_TIERS.indexOf(tier) + 1;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 ${healthBarClass(tier ?? "critical")}`}
    >
      {[0, 1, 2].map((index) => (
        <svg
          key={index}
          viewBox="0 0 12 18"
          className={`h-4 w-2.5 ${index < intact ? "health-rhombus" : "fill-ink/10 text-ink/35"}`}
        >
          {index === 0 && (
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="var(--hp-c1)" />
                <stop offset="0.5" stopColor="var(--hp-c2)" />
                <stop offset="1" stopColor="var(--hp-c3)" />
              </linearGradient>
            </defs>
          )}
          <path
            d="M6 1 11 9 6 17 1 9Z"
            stroke="currentColor"
            fill={index < intact ? `url(#${gradient})` : undefined}
          />
          {index >= intact && (
            <path
              d="m7 2-3 5 4 3-3 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          )}
        </svg>
      ))}
    </span>
  );
}

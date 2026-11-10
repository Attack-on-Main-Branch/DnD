"use client";

import { useId } from "react";

import BannerMotion from "./banner-motion";

import styles from "./printstream-banner.module.css";

const PEARL_FIELDS = [
  { color: "pink", x: 860, y: 600 },
  { color: "champagne", x: 730, y: 825 },
  { color: "green", x: 470, y: 825 },
  { color: "cyan", x: 340, y: 600 },
  { color: "blue", x: 470, y: 375 },
  { color: "violet", x: 730, y: 375 },
];
const PEARL_FALLOFF = [
  { offset: 0, opacity: 0.95 },
  { offset: 0.25, opacity: 0.85 },
  { offset: 0.5, opacity: 0.5 },
  { offset: 0.75, opacity: 0.14 },
  { offset: 1, opacity: 0 },
];

export default function PrintstreamBanner({ animated = true }) {
  const id = useId();

  return (
    <BannerMotion className={styles.surface} disabled={!animated}>
      <span className={styles.pearl}>
        <svg viewBox="0 0 1200 1200" aria-hidden="true">
          <defs>
            {PEARL_FIELDS.map(({ color }) => (
              <radialGradient id={`${id}-pearl-${color}`} key={color}>
                {PEARL_FALLOFF.map(({ offset, opacity }) => (
                  <stop
                    key={offset}
                    offset={offset}
                    stopColor={`var(--color-pearl-${color})`}
                    stopOpacity={opacity}
                  />
                ))}
              </radialGradient>
            ))}
            <filter
              id={`${id}-pearl-softness`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="24" />
            </filter>
          </defs>
          <rect
            width="1200"
            height="1200"
            fill="var(--color-printstream-paper)"
          />
          <g filter={`url(#${id}-pearl-softness)`}>
            {PEARL_FIELDS.map(({ color, x, y }) => (
              <circle
                key={color}
                cx={x}
                cy={y}
                r="340"
                fill={`url(#${id}-pearl-${color})`}
              />
            ))}
          </g>
        </svg>
      </span>
      <span className={styles.grain} />
      <svg
        className={styles.markings}
        viewBox="0 0 1200 486"
        preserveAspectRatio="xMidYMid slice"
        fill="currentColor"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`${id}-dots`}
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <rect width="5" height="5" />
            <rect x="9" y="9" width="5" height="5" />
          </pattern>
          <pattern
            id={`${id}-bars`}
            width="21"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0h2v40H0zM5 0h4v40H5zM12 0h1v40h-1zM16 0h3v40h-3z" />
          </pattern>
          <path
            id={`${id}-cross`}
            d="M0 0h16l22 22L60 0h16L46 30l30 30H60L38 38 16 60H0l30-30Z"
          />
        </defs>

        <path d="M0 0h212l-35 27H0ZM1020 0h180v45h-140ZM0 444h570l26-26h604v68H0Z" />
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M28 58V38h20M28 307v23h23M1149 76h23v23M1172 350v23h-23" />
          <path d="m636 45 27-27m-14 27 27-27m-14 27 27-27m-14 27 27-27" />
          <path d="M959 88h25l44 44-44 44h-25l44-44ZM1013 88h25l44 44-44 44h-25l44-44Z" />
          <path d="M1122 278h18v18m-18 22h18v-18m-40-4v-18h18m-18 22v18h18" />
          <circle cx="945" cy="302" r="10" />
          <path d="m938 309 14-14M981 302h54M981 313h40" />
          <path d="M77 373c-32-18-31-37-17-37 9 0 17 10 17 10s8-10 17-10c14 0 15 19-17 37Z" />
        </g>
        <use href={`#${id}-cross`} x="746" y="94" />
        <use href={`#${id}-cross`} x="830" y="94" />
        <path d="m916 102 12 12-12 12-12-12Zm0 31 12 12-12 12-12-12Zm31-31 12 12-12 12-12-12Zm0 31 12 12-12 12-12-12Z" />
        <rect
          x="1045"
          y="207"
          width="66"
          height="66"
          fill={`url(#${id}-dots)`}
        />
        <rect
          x="500"
          y="39"
          width="84"
          height="24"
          fill={`url(#${id}-dots)`}
          opacity="0.7"
        />
        <rect
          x="728"
          y="294"
          width="131"
          height="24"
          fill={`url(#${id}-bars)`}
        />
        <path d="M392 35h92v3h-92zm0 10h92v3h-92zm0 10h92v3h-92zM1125 195h22v22h-22zM1138 228h9v9h-9zM1119 243h9v9h-9z" />
        <g fill="var(--color-printstream-paper)">
          <path d="M1029 449h12v12h-12zm18 0h12v12h-12zm-18 18h12v12h-12zm36-18h12v12h-12z" />
          <circle
            cx="1145"
            cy="460"
            r="13"
            fill="none"
            stroke="var(--color-printstream-paper)"
            strokeWidth="2"
          />
          <path
            d="m1135 470 20-20"
            fill="none"
            stroke="var(--color-printstream-paper)"
            strokeWidth="2"
          />
          <text
            x="46"
            y="473"
            fontFamily="monospace"
            fontSize="17"
            letterSpacing="3"
          >
            PRINT//STREAM
          </text>
          <text
            x="752"
            y="473"
            fontFamily="monospace"
            fontSize="14"
            letterSpacing="3"
          >
            HANDLE W/ CARE
          </text>
        </g>
        <g fill="none" strokeWidth="4">
          <path d="M417 454h112m-112 12h90" stroke="var(--color-pearl-cyan)" />
          <path d="M428 460h112" stroke="var(--color-pearl-pink)" />
          <path d="M417 472h112" stroke="var(--color-pearl-violet)" />
        </g>
      </svg>
      <span className={styles.edge} />
    </BannerMotion>
  );
}

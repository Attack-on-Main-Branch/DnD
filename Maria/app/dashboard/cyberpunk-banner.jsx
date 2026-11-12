"use client";

import { useId } from "react";

import { diceColorHex } from "./character-presentation";

import styles from "./cyberpunk-banner.module.css";

const MAIN_BAND =
  "M-24 179H59l36-36h216l26 26h147l30-30h181l63 63h177l40-40h249v57H994l-33 33H773l-36 31H579l84 77h115l36-32h243l34-28h133v56H1110l-38 34H824l-24 23H455l-59-54H251l-41 36H-24v-34H185l42-38H414l59 55H689l-83-77H510l-91-83H309l-28 26H-24Z";

const ACCENT_BANDS = [
  "M-24 50H99l31-31h306l-45 44H242l-45 37H-24Z",
  "M830 20h124l45 38h225v14H991l-46-38H844Z",
  "M552 432H907l31 28h129l157-135v63L1090 486H921l-39-28H594l-24 25h-61Z",
  "M-24 459H174l39-36h139l42 35h143l-27 15H384l-42-34H224l-37 32H-24Z",
];

function slashes({ x, y, count, width, height, skew, step }) {
  return Array.from(
    { length: count },
    (_, index) =>
      `M${x + index * step} ${y}h${width}l${-skew} ${height}h${-width}Z`,
  ).join(" ");
}

const CUTOUTS = [
  { x: 127, y: 153, count: 7, width: 12, height: 24, skew: 24, step: 22 },
  { x: 594, y: 151, count: 5, width: 11, height: 37, skew: -37, step: 21 },
  { x: 346, y: 288, count: 4, width: 12, height: 35, skew: -35, step: 25 },
  { x: 977, y: 170, count: 6, width: 10, height: 25, skew: 25, step: 20 },
  { x: 877, y: 338, count: 5, width: 10, height: 23, skew: 23, step: 21 },
]
  .map(slashes)
  .join(" ");

const HATCHES = [
  { x: 455, y: 19, count: 5, width: 14, height: 44, skew: 44, step: 24 },
  { x: 931, y: 95, count: 7, width: 9, height: 17, skew: 17, step: 16 },
  { x: 245, y: 366, count: 5, width: 11, height: 24, skew: 24, step: 21 },
]
  .map(slashes)
  .join(" ");

const CIRCUITS = [
  [
    [-10, 32],
    [55, 32],
    [81, 9],
    [371, 9],
  ],
  [
    [1210, 59],
    [1033, 59],
    [991, 21],
    [732, 21],
  ],
  [
    [-10, 126],
    [268, 126],
    [294, 102],
    [479, 102],
  ],
  [
    [1210, 123],
    [1101, 123],
    [1067, 149],
    [854, 149],
    [806, 106],
    [560, 106],
    [523, 136],
    [420, 136],
  ],
  [
    [1210, 280],
    [1051, 280],
    [1026, 304],
    [862, 304],
    [838, 280],
    [650, 280],
  ],
  [
    [-10, 271],
    [25, 271],
    [56, 294],
    [264, 294],
  ],
  [
    [1210, 410],
    [1143, 410],
    [1117, 433],
    [963, 433],
  ],
  [
    [-10, 420],
    [83, 420],
    [108, 399],
    [213, 399],
    [240, 423],
    [405, 423],
  ],
  [
    [1210, 477],
    [1059, 477],
    [1021, 446],
    [763, 446],
    [737, 469],
    [694, 469],
  ],
].map((points) => ({
  points: points.map((point) => point.join(",")).join(" "),
  node: points.at(-1),
}));

export default function CyberpunkBanner({ diceColor }) {
  const id = useId();

  return (
    <span
      className={styles.surface}
      style={{ "--cyberpunk-color": diceColorHex(diceColor) }}
    >
      <svg
        className={styles.circuitry}
        viewBox="0 0 1200 486"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <mask id={`${id}-cutouts`}>
            <rect x="-24" y="0" width="1248" height="486" fill="white" />
            <path
              fill="black"
              d={`${CUTOUTS} M405 196h30l151 142h-30Z M293 214h89l26 26h-22l-14-12h-96Z`}
            />
          </mask>
        </defs>
        <path
          className={styles.band}
          d={MAIN_BAND}
          mask={`url(#${id}-cutouts)`}
        />
        <g className={styles.accents}>
          {ACCENT_BANDS.map((path) => (
            <path key={path} d={path} />
          ))}
          <path d={HATCHES} />
        </g>
        <g className={styles.traces}>
          {CIRCUITS.map(({ points, node: [x, y] }, index) => (
            <g
              key={points}
              className={index % 2 ? styles.secondary : undefined}
            >
              <polyline points={points} />
              <circle cx={x} cy={y} r="4" />
            </g>
          ))}
        </g>
      </svg>
    </span>
  );
}

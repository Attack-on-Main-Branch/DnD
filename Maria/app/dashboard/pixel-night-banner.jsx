"use client";

import { useId } from "react";

import BannerMotion from "./banner-motion";

import styles from "./pixel-night-banner.module.css";

const CLOUD_TONES = [styles.cloudShadow, styles.cloudMid, styles.cloudLight];

function pixelSprite(rows, tones) {
  const paths = tones.map(() => []);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const tone = row[x];
      let end = x + 1;
      while (row[end] === tone) end++;
      if (tone !== " ") {
        const width = end - x;
        paths[Number(tone) - 1].push(`M${x} ${y}h${width}v1h${-width}Z`);
      }
      x = end;
    }
  });
  return {
    width: Math.max(...rows.map((row) => row.length)),
    height: rows.length,
    layers: paths.map((path, index) => ({
      path: path.join(" "),
      className: tones[index],
    })),
  };
}

function cloudSprite(width, height, paths) {
  return {
    width,
    height,
    layers: paths.map((path, index) => ({
      path,
      className: CLOUD_TONES[index],
    })),
  };
}

const CLOUDS = [
  {
    className: styles.leftCloud,
    align: "xMinYMax meet",
    sprite: cloudSprite(80, 28, [
      "M0 19H3V16H6V12H10V9H16V11H20V7H23V3H26V1H33V4H36V8H40V6H47V8H51V11H56V14H61V17H66V19H71V21H77V23H80V25H69V26H53V25H36V27H17V26H0Z",
      "M0 19H3V16H6V12H10V9H16V11H20V7H23V3H26V1H33V4H36V8H40V6H47V8H51V11H56V14H61V17H66V19H71V21H74V22H66V24H58V23H48V24H35V23H26V25H13V23H4V22H0Z",
      [
        "M26 1H33V4H36V8H40V6H47V8H51V11H48V13H40V14H34V12H30V9H26V6H24V3H26Z",
        "M10 9H16V11H20V15H17V18H10V16H7V12H10Z",
        "M23 15H29V17H34V16H41V18H48V17H53V19H60V21H56V22H45V21H38V22H30V20H25V19H21V17H23Z",
        "M63 20H69V21H73V22H63Z",
      ].join(" "),
    ]),
  },
  {
    className: styles.rightCloud,
    align: "xMaxYMax meet",
    sprite: cloudSprite(76, 27, [
      "M0 22H3V20H7V16H11V12H15V14H18V8H22V5H28V2H35V5H39V4H43V1H50V3H54V7H58V10H62V13H67V17H72V19H76V25H62V26H45V25H28V26H12V24H4V25H0Z",
      "M3 21H7V16H11V12H15V14H18V8H22V5H28V2H35V5H39V4H43V1H50V3H54V7H58V10H62V13H67V17H72V19H76V22H66V23H57V22H48V24H37V22H28V24H18V22H10V23H3Z",
      [
        "M28 2H35V5H39V4H43V1H50V3H54V7H51V9H46V10H39V9H35V11H29V9H25V6H28Z",
        "M11 12H15V14H18V10H22V8H25V12H22V15H25V17H19V18H13V16H10V14H11Z",
        "M28 15H35V14H40V16H46V14H51V17H59V16H63V19H69V21H61V22H53V20H45V21H38V19H31V20H27V18H28Z",
        "M63 14H67V17H72V19H66V17H63Z",
      ].join(" "),
    ]),
  },
];

const CRATERS = [
  [8, 8, 2],
  [18, 6, 1],
  [20, 17, 2],
  [11, 20, 1],
  [6, 16, 1],
];
const MOON = pixelSprite(
  Array.from({ length: 28 }, (_, y) =>
    Array.from({ length: 28 }, (_, x) => {
      if ((x - 13.5) ** 2 + (y - 13.5) ** 2 > 13.5 ** 2) return " ";
      if (
        CRATERS.some(
          ([cx, cy, radius]) => (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2,
        )
      )
        return "1";
      return x + y * 0.5 < 16 ? "3" : "2";
    }).join(""),
  ),
  [styles.moonCrater, styles.moonBody, styles.moonLight],
);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DITHER = [4, 8, 12].map((coverage) => ({
  coverage,
  path: BAYER.flatMap((value, index) =>
    value < coverage
      ? [`M${(index % 4) * 2} ${Math.floor(index / 4) * 2}h2v2h-2Z`]
      : [],
  ).join(" "),
}));
const SKY_BANDS = [
  { name: "middle", start: 28, className: styles.skyMiddle },
  { name: "lower", start: 60, className: styles.skyLower },
];

const STARS = [
  { x: 28, y: 25, size: 1, period: 4.6, phase: -1.8 },
  { x: 74, y: 15, size: 2, period: 5.2, phase: -4.1 },
  { x: 102, y: 43, size: 1, period: 3.8, phase: -0.6 },
  { x: 138, y: 25, size: 1, period: 4.4, phase: -2.5 },
  { x: 174, y: 53, size: 2, period: 5.8, phase: -1.3 },
  { x: 202, y: 14, size: 1, period: 3.6, phase: -2.8 },
  { x: 235, y: 37, size: 1, period: 4.9, phase: -0.2 },
  { x: 244, y: 17, size: 2, period: 5.4, phase: -3.6 },
  { x: 303, y: 61, size: 1, period: 4.2, phase: -2.1 },
  { x: 14, y: 67, size: 1, period: 5.7, phase: -3.2 },
  { x: 119, y: 73, size: 1, period: 4.1, phase: -1.2 },
  { x: 219, y: 65, size: 1, period: 5.1, phase: -4.6 },
];

const DUST = [
  [5, 13],
  [50, 6],
  [64, 45],
  [92, 7],
  [117, 13],
  [150, 5],
  [158, 35],
  [185, 8],
  [220, 23],
  [252, 5],
  [281, 45],
  [312, 50],
  [35, 52],
  [56, 66],
  [86, 61],
  [145, 64],
  [194, 39],
  [254, 59],
];

const HAZE = [
  [0, 117, 38],
  [25, 119, 31],
  [87, 116, 32],
  [123, 108, 18],
  [139, 110, 14],
  [156, 112, 9],
  [171, 109, 22],
  [207, 122, 35],
  [239, 124, 52],
  [282, 112, 38],
  [116, 126, 14],
  [153, 121, 17],
];

export default function PixelNightBanner({ animated = true }) {
  const id = useId();

  return (
    <BannerMotion className={styles.surface} disabled={!animated}>
      <svg
        className={styles.sky}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          {SKY_BANDS.flatMap(({ name, className }) =>
            DITHER.map(({ coverage, path }) => (
              <pattern
                key={`${name}-${coverage}`}
                id={`${id}-${name}-${coverage}`}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                className={className}
              >
                <path d={path} />
              </pattern>
            )),
          )}
        </defs>
        {SKY_BANDS.map(({ name, start, className }) => (
          <g key={name}>
            {DITHER.map(({ coverage }, index) => (
              <rect
                key={coverage}
                y={`${start + index * 3}%`}
                width="100%"
                height="3.1%"
                fill={`url(#${id}-${name}-${coverage})`}
              />
            ))}
            <rect
              y={`${start + DITHER.length * 3}%`}
              width="100%"
              height="100%"
              className={className}
            />
          </g>
        ))}
        <svg
          viewBox="0 0 320 130"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
        >
          <g className={styles.dust}>
            {DUST.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
            ))}
          </g>
          <path
            className={styles.horizon}
            d="M0 112h58v2h36v2h33v2h34v2h59v-2h36v-6h64v18H0Z"
          />
          <g className={styles.haze}>
            {HAZE.map(([x, y, width]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width={width} height="2" />
            ))}
          </g>
        </svg>
      </svg>
      <svg
        className={styles.moon}
        viewBox={`0 0 ${MOON.width} ${MOON.height}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        {MOON.layers.map(({ path, className }) => (
          <path key={className} d={path} className={className} />
        ))}
      </svg>
      {STARS.map(({ x, y, size, period, phase }) => (
        <svg
          key={`${x}-${y}`}
          className={styles.star}
          viewBox="-4 -4 8 8"
          shapeRendering="crispEdges"
          aria-hidden="true"
          style={{
            left: `${(x / 320) * 100}%`,
            top: `${(y / 130) * 100}%`,
            "--star-size": size * 8,
            "--star-period": `${period}s`,
            "--star-phase": `${phase}s`,
          }}
        >
          <path
            className={styles.halo}
            d="M-1-4h2v2h2v1h1v2H2v2H1v1h-2V2h-2V1h-1v-2h2v-2h1Z"
          />
          <path className={styles.spark} d="M0-3h1v2h2v1H1v2H0V0h-2v-1h2Z" />
        </svg>
      ))}
      {CLOUDS.map(({ className, align, sprite: { width, height, layers } }) => (
        <svg
          key={className}
          className={`${styles.cloud} ${className}`}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio={align}
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          {layers.map(({ path, className: tone }) => (
            <path key={tone} d={path} className={tone} />
          ))}
        </svg>
      ))}
    </BannerMotion>
  );
}

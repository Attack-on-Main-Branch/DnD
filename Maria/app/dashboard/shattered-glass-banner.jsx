"use client";

import { useId } from "react";

import BannerMotion from "./banner-motion";

import styles from "./shattered-glass-banner.module.css";

const FRACTURES = [
  {
    className: styles.radial,
    path: [
      "M838 193 815 170 783 158 751 126 703 110 662 67 621 44 590-10",
      "M846 190 838 153 847 125 828 76 834 49 821-10",
      "M860 191 887 163 905 126 940 106 963 62 1002 38 1019-10",
      "M866 202 917 195 943 177 1001 181 1040 156 1117 144 1155 121 1210 112",
      "M864 213 900 233 938 242 970 273 1007 280 1074 328 1120 344 1209 411",
      "M856 219 862 258 893 296 889 334 922 382 924 420 972 496",
      "M845 219 824 253 815 292 785 322 769 375 734 416 704 496",
      "M834 210 793 232 756 236 710 260 676 253 615 283 561 284 483 325 404 340 331 391 230 420 180 496",
      "M833 201 783 192 758 199 710 182 664 186 603 167 552 172 507 149 452 151 391 124 336 129 268 100 210 105 139 80",
    ].join(" "),
  },
  {
    className: styles.branches,
    path: [
      "M751 126 743 90 704 59 697 20 677-10M703 110 680 116 652 104 602 102 571 84 522 85",
      "M847 125 866 100 869 62 893 33 895-10M905 126 902 89 922 54 925 15",
      "M1001 181 1036 202 1080 193 1106 207 1176 205 1210 220M1117 144 1126 111 1161 81 1178 42",
      "M970 273 968 307 1000 350 1007 390 1034 423 1041 486M1074 328 1114 314 1161 323 1210 310",
      "M893 296 872 324 869 369 844 405 843 447 823 486M815 292 782 281 743 295 707 290 661 314",
      "M734 416 686 423 644 450 602 453 560 486M615 283 595 312 558 327 532 363 497 382",
      "M483 325 459 298 424 286 405 255 368 236 336 202M404 340 376 328 334 342 285 338 251 350",
      "M664 186 644 211 605 218 571 243 526 246M507 149 487 176 458 182 423 205 389 204",
      "M268 100 249 72 214 59 197 32M139 80 105 91 59 83 24 94",
    ].join(" "),
  },
  {
    className: styles.rings,
    path: [
      "M815 170 822 155 838 153 867 149 887 163 901 177 917 195 909 217 900 233 875 245 862 258 841 247 824 253 805 242 793 232 779 212 783 192 797 181Z",
      "M783 158 808 133 826 137M847 125 877 117 905 126M943 177 951 204 938 242 917 257M893 296 855 283 831 297 815 292 786 268 756 236 758 199 747 179 766 169",
      "M751 126 774 117 803 119M940 106 962 134 980 144M1007 280 982 289 963 318M785 322 751 319 726 300 710 260M710 182 716 156 703 139",
    ].join(" "),
  },
  {
    className: styles.splinters,
    path: [
      "M838 193 831 178 838 153M846 190 853 168 867 149M860 191 876 184 887 163",
      "M866 202 891 207 917 195M864 213 877 223 900 233M856 219 851 238 862 258",
      "M845 219 836 232 824 253M834 210 817 214 793 232M833 201 813 194 783 192",
      "M831 178 815 170 813 194 805 205 817 214 805 242M853 168 852 157 867 149",
      "M876 184 901 177M891 207 882 191 901 177M877 223 875 245 851 238 836 232",
      "M813 194 827 200 817 214M838 193 843 201 834 210M860 191 855 202 866 202",
      "M845 219 849 208 856 219M827 200 831 178M882 191 876 184",
    ].join(" "),
  },
];

const SHARDS = [
  {
    points:
      "838,153 847,125 828,76 834,49 821,-10 590,-10 621,44 662,67 703,110 751,126 783,158 815,170 822,155",
    angle: -24,
    lift: 2,
  },
  {
    points:
      "867,149 887,163 905,126 940,106 963,62 1002,38 1019,-10 895,-10 893,33 869,62 866,100 847,125",
    angle: 32,
    lift: 3,
  },
  {
    points:
      "917,195 943,177 1001,181 1040,156 1117,144 1155,121 1210,112 1210,220 1176,205 1106,207 1080,193 1036,202 1001,181",
    angle: -38,
    lift: 2,
  },
  {
    points:
      "900,233 938,242 970,273 968,307 1000,350 1007,390 1034,423 1041,486 972,496 924,420 922,382 889,334 893,296 862,258 875,245",
    angle: 23,
    lift: 3,
  },
  {
    points:
      "824,253 815,292 785,322 769,375 734,416 704,496 602,496 644,450 686,423 734,416 769,375 785,322 751,319 726,300 710,260 756,236 793,232 805,242",
    angle: -17,
    lift: 2,
  },
  { points: "815,170 822,155 838,153 831,178 838,193", angle: 62, lift: 10 },
  { points: "853,168 867,149 887,163 876,184 860,191", angle: -48, lift: 7 },
  {
    points: "876,184 901,177 882,191 891,207 866,202 860,191",
    angle: 46,
    lift: 5,
  },
  {
    points: "866,202 891,207 909,217 900,233 877,223 864,213",
    angle: -35,
    lift: 12,
  },
  { points: "856,219 851,238 875,245 862,258", angle: 38, lift: 8 },
  {
    points: "845,219 836,232 824,253 805,242 817,214 834,210",
    angle: -56,
    lift: 9,
  },
  {
    points: "833,201 813,194 783,192 797,181 815,170 831,178 827,200",
    angle: 18,
    lift: 6,
  },
].map((shard) => {
  const vertices = shard.points
    .split(" ")
    .map((point) => point.split(",").map(Number));
  const front = vertices.map(([x, y]) => [
    x - shard.lift * 0.2,
    y - shard.lift * 0.4,
  ]);
  const back = vertices.map(([x, y]) => [x + 1, y + shard.lift]);
  return {
    ...shard,
    sides: vertices
      .map((_, index) => {
        const next = (index + 1) % vertices.length;
        return `M${front[index]} ${front[next]} ${back[next]} ${back[index]}Z`;
      })
      .join(" "),
  };
});

const LIGHT_STOPS = [
  [0, "ink", 0],
  [0.22, "sky-100", 0.015],
  [0.43, "sky-100", 0.06],
  [0.48, "ink", 0.34],
  [0.49, "ink", 0.72],
  [0.5, "pearl-cyan", 0.18],
  [0.54, "sky-100", 0.035],
  [0.74, "gold", 0.07],
  [1, "gold", 0],
];

export default function ShatteredGlassBanner({ animated = true }) {
  const id = useId();

  return (
    <BannerMotion className={styles.surface} disabled={!animated}>
      <svg
        className={styles.glass}
        viewBox="0 0 1200 486"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0.3" y2="1">
            <stop stopColor="var(--color-ink)" stopOpacity="0.8" />
            <stop
              offset="0.18"
              stopColor="var(--color-pearl-cyan)"
              stopOpacity="0.5"
            />
            <stop offset="0.42" stopColor="var(--color-surface)" />
            <stop
              offset="0.76"
              stopColor="var(--color-sky-100)"
              stopOpacity="0.35"
            />
            <stop offset="1" stopColor="var(--color-surface)" />
          </linearGradient>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0.7" y2="1">
            <stop stopColor="var(--color-sky-100)" stopOpacity="0.14" />
            <stop
              offset="0.36"
              stopColor="var(--color-sky-100)"
              stopOpacity="0.025"
            />
            <stop
              offset="0.63"
              stopColor="var(--color-surface)"
              stopOpacity="0.45"
            />
            <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0.09" />
          </linearGradient>
          <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
            {LIGHT_STOPS.map(([offset, color, opacity]) => (
              <stop
                key={offset}
                offset={offset}
                stopColor={`var(--color-${color})`}
                stopOpacity={opacity}
              />
            ))}
          </linearGradient>
          <radialGradient id={`${id}-falloff`}>
            <stop stopColor="var(--color-ink)" stopOpacity="0.9" />
            <stop
              offset="0.23"
              stopColor="var(--color-pearl-cyan)"
              stopOpacity="0.3"
            />
            <stop
              offset="1"
              stopColor="var(--color-pearl-cyan)"
              stopOpacity="0"
            />
          </radialGradient>
          <filter
            id={`${id}-shadow`}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
          >
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <g id={`${id}-illumination`} className={styles.illumination}>
            <rect
              x="-450"
              y="-340"
              width="2100"
              height="1050"
              fill={`url(#${id}-light)`}
            />
          </g>
          {SHARDS.map(({ points }, index) => (
            <clipPath id={`${id}-shard-${index}`} key={points}>
              <polygon points={points} />
            </clipPath>
          ))}
        </defs>

        <g className={styles.caustics}>
          <ellipse
            cx="865"
            cy="231"
            rx="145"
            ry="105"
            fill={`url(#${id}-falloff)`}
            opacity="0.18"
          />
          {SHARDS.slice(5).map(({ points, lift }) => (
            <polygon
              key={points}
              points={points}
              transform={`translate(${lift * 1.6} ${lift * 2.4})`}
              fill="none"
              stroke={`url(#${id}-edge)`}
              strokeWidth="2"
              opacity="0.3"
            />
          ))}
        </g>

        {SHARDS.map(({ points, sides, angle, lift }, index) => (
          <g key={points}>
            {lift > 3 && (
              <polygon
                points={points}
                transform={`translate(${lift * 0.6} ${lift * 1.2})`}
                className={styles.shardShadow}
                filter={`url(#${id}-shadow)`}
              />
            )}
            <path
              d={sides}
              fill={`url(#${id}-edge)`}
              className={styles.thickness}
            />
            <g transform={`translate(${-lift * 0.2} ${-lift * 0.4})`}>
              <polygon points={points} fill={`url(#${id}-body)`} />
              <g clipPath={`url(#${id}-shard-${index})`}>
                <g
                  transform={`rotate(${angle} 850 205) translate(${lift * 3} ${-lift * 4})`}
                >
                  <use href={`#${id}-illumination`} />
                </g>
                <polygon points={points} className={styles.dispersionWarm} />
                <polygon points={points} className={styles.dispersionCool} />
              </g>
              <polygon
                points={points}
                className={styles.bevel}
                stroke={`url(#${id}-edge)`}
              />
            </g>
          </g>
        ))}

        <g fill="none" strokeLinejoin="bevel">
          {FRACTURES.map(({ className, path }) => (
            <g key={className} className={className}>
              <path d={path} className={styles.depth} />
              <path d={path} className={styles.refraction} />
              <path d={path} className={styles.edge} />
            </g>
          ))}
        </g>
        <path
          className={styles.impact}
          d="m838 193 8-3 5 4 9-3 2 8 4 3-2 11-8 6-6-3-5 3-5-8-6-1-1-9Z"
        />
        <path
          className={styles.impactRim}
          stroke={`url(#${id}-edge)`}
          d="m831 187 15-5 8 5 10-2 4 10 6 6-3 15-13 11-10-4-7 3-8-10-7-2-1-15Z"
        />
        <path
          className={styles.chips}
          d="m838 193 5 8-9 9m26-19-5 11 11 0m-21 17 4-11 7 11m-30-46 4 4-3 9m49-25-5 5 1 8m-59 59 4-5 4 2m42 14 5 2-3 5"
        />
      </svg>
    </BannerMotion>
  );
}

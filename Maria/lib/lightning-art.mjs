export const LIGHTNING_FRAME = { width: 1200, height: 486 };
export const LIGHTNING_INTERVAL = 5.8;

function fork(start, end, roughness, seed, depth = 4) {
  if (!depth) return [start, end];
  const wave = Math.sin(seed * 127.1 + depth * 311.7) * 43758.5453;
  const middle = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + (wave - Math.floor(wave) - 0.5) * roughness,
  ];
  return [
    ...fork(start, middle, roughness * 0.55, seed + 1, depth - 1).slice(0, -1),
    ...fork(middle, end, roughness * 0.55, seed + 7, depth - 1),
  ];
}

function ribbon(points, width) {
  const edges = points.map(([x, y], index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const radius =
      (width * (1 - index / (points.length - 1)) ** 0.75 + 0.08) / 2;
    return [
      [x - (dy / length) * radius, y + (dx / length) * radius],
      [x + (dy / length) * radius, y - (dx / length) * radius],
    ];
  });
  const outline = [
    ...edges.map(([left]) => left),
    ...edges.map(([, right]) => right).reverse(),
  ];
  const middle = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const pair = (point) => point.map((value) => value.toFixed(1)).join(",");
  const start = middle(outline.at(-1), outline[0]);
  return `M${pair(start)}${outline.map((point, index) => `Q${pair(point)} ${pair(middle(point, outline[(index + 1) % outline.length]))}`).join("")}Z`;
}

const routes = [
  [0.23, 0.39, 0.28, 0.59, 0.49, 0.67, 0.46, 0.57, 0.38],
  [0.76, 0.58, 0.66, 0.4, 0.52, 0.22, 0.31, 0.18, 0.3],
  [0.36, 0.23, 0.42, 0.29, 0.62, 0.48, 0.73, 0.6, 0.79],
];
const columns = [1.02, 0.89, 0.77, 0.64, 0.52, 0.39, 0.25, 0.12, -0.02];

export const LIGHTNING_STRIKES = routes.map((route, variation) => {
  const anchors = route.map((y, index) => [
    columns[index] * LIGHTNING_FRAME.width,
    y * LIGHTNING_FRAME.height,
  ]);
  const main = anchors.flatMap((point, index) =>
    index
      ? fork(anchors[index - 1], point, 65, index * 13 + variation * 83).slice(
          1,
        )
      : [point],
  );
  const branches = [17, 33, 50, 67, 82, 99, 113].map((index, branch) => {
    const start = main[index];
    return fork(
      start,
      [
        start[0] - 130 - (branch % 3) * 43,
        start[1] + ((branch + variation) % 2 ? 145 : -130),
      ],
      60,
      index + variation * 31,
    );
  });
  const segments = [
    { points: main, width: 20 },
    ...branches.map((points, index) => ({ points, width: 3.1 - index * 0.23 })),
    ...branches.map((points, index) => ({
      points: fork(
        points[8],
        [
          points[8][0] - 95,
          points[8][1] + ((index + variation) % 2 ? -65 : 60),
        ],
        30,
        index + variation * 57,
        3,
      ),
      width: 1.2,
    })),
  ];
  return {
    body: segments.map(({ points, width }) => ribbon(points, width)).join(""),
    core: segments
      .map(({ points, width }) => ribbon(points, width * 0.24))
      .join(""),
  };
});

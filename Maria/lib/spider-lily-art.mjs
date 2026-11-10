export const SPIDER_LILY_FRAME = { width: 1200, height: 486, groundStart: 400 };

export const SPIDER_LILY_FLOWERS = [
  { name: "left", x: 90, y: 116, size: 325, sprite: 3, angle: -6 },
  { name: "center", x: 545, y: 10, size: 410, sprite: 0, angle: -4 },
  {
    name: "gap",
    x: 845,
    y: 18,
    size: 330,
    sprite: 1,
    angle: -2,
    mirror: true,
  },
  { name: "right", x: 1120, y: -10, size: 450, sprite: 2, angle: 4 },
  { name: "front-left", x: 190, y: 298, size: 303, sprite: 4, angle: -8 },
  {
    name: "front-center",
    x: 435,
    y: 268,
    size: 318,
    sprite: 1,
    angle: 5,
    brightness: 0.94,
  },
  { name: "front-gap", x: 748, y: 220, size: 366, sprite: 5, angle: -5 },
  { name: "front-right", x: 1005, y: 287, size: 320, sprite: 3, angle: 5 },
  { name: "edge", x: 1260, y: 267, size: 374, sprite: 0, angle: -6 },
];

export const SPIDER_LILY_WIND = [
  { name: "meadow", x: SPIDER_LILY_FRAME.width / 2 },
  ...SPIDER_LILY_FLOWERS,
].map(({ name, x }, index) => {
  const duration = 3.1 + ((index * 7) % 13) / 10;
  return {
    name,
    origin: `${(x / SPIDER_LILY_FRAME.width) * 100}% 125%`,
    duration: `${duration}s`,
    delay: `${-0.6 - index * 0.83}s`,
    sway: `${(index % 2 === 0 ? 1 : -1) * (1.8 + ((index * 3) % 7) / 10)}deg`,
    flutterDuration: `${duration * 1.618}s`,
    flutterDelay: `${-0.4 - index * 1.37}s`,
  };
});

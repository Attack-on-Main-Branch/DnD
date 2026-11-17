export const PILE_WIDTH = 116;
export const PILE_HEIGHT = 124;
const artWidth = PILE_WIDTH;
const artHeight = PILE_HEIGHT;
const artBleed = 20;
const restingWidth = artWidth + 2 * artBleed;
const shadowHeight = artHeight + 10;
const artInset = 0.5;
const artScale = 5 / 3;
const artTop = 13;
const groundY = artHeight - 4;
const coinRadiusX = 6.8;
const coinRadiusY = 2.08;
const coinDepth = 2.23;
const labelGap = 6;
const flightSide = 17;
const flightTop = 54;
const flightWidth = artWidth + 2 * flightSide;
const flightHeight = artHeight + flightTop;
const rows = [
  [
    [0, 0, 4, 11],
    [0, 0, 6, 17],
    [0, 0, 3, 12],
  ],
  [
    [0, 0, 2, 7],
    [0, 0, 6, 13],
    [0, 0, 7, 15],
    [0, 0, 3, 9],
  ],
  [
    [0, 0, 1, 4],
    [0, 0, 5, 11],
    [0, 4, 9, 12],
    [0, 3, 5, 11],
    [0, 0, 0, 5],
  ],
  [
    [0, 0, 2, 6],
    [0, 5, 6, 12],
    [0, 5, 5, 10],
    [0, 0, 3, 6],
  ],
  [
    [0, 0, 0, 3],
    [0, 2, 2, 6],
    [0, 3, 4, 6],
    [0, 2, 3, 5],
    [0, 0, 0, 3],
  ],
  [
    [0, 0, 0, 2],
    [7, 7, 7, 7],
    [5, 5, 5, 5],
    [0, 0, 0, 2],
  ],
];
const rowSpacing = 12.4;
const stacks = rows.flatMap((row, depth) =>
  row.map((levels, column) => ({
    x: 34.5 + (column - (row.length - 1) / 2) * 13.9,
    depth: depth * rowSpacing,
    floor: 79.5 - (rows.length - 1 - depth) * rowSpacing * 0.23,
    levels,
  })),
);
const neighbors = stacks.map((stack, i) =>
  stacks.flatMap((other, j) => {
    return i !== j &&
      Math.hypot(stack.x - other.x, stack.depth - other.depth) < 15
      ? [j]
      : [];
  }),
);
const layers = stacks.map(() => 0);
const placements = [];
const grain = (index) => {
  const wave = Math.sin(index * 78.233 + 12.9898) * 43758.5453;
  return wave - Math.floor(wave);
};
function placeCoin(column) {
  const stack = stacks[column];
  const layer = layers[column]++;
  const index = placements.length;
  placements.push({
    column,
    index,
    layer,
    x: stack.x + Math.sin(layer * 0.64 + column) * 0.13,
    y: stack.floor - (layer + 1) * coinDepth,
  });
}
placeCoin(stacks.findIndex((stack) => stack.levels[0] > 0));
for (let stage = 0; stage < stacks[0].levels.length; stage++) {
  const initial = layers.slice();
  const additions = stacks.map((stack, i) => stack.levels[stage] - initial[i]);
  const total = additions.reduce((sum, count) => sum + count, 0);
  for (let step = 1; step <= total; step++) {
    let column = 0;
    let best = -Infinity;
    for (const [i, stack] of stacks.entries()) {
      if (layers[i] === stack.levels[stage]) continue;
      if (!layers[i] && !neighbors[i].some((neighbor) => layers[neighbor]))
        continue;
      const deficit = (step * additions[i]) / total - (layers[i] - initial[i]);
      const score = deficit + 0.07 * grain(placements.length * 13 + i);
      if (score > best) {
        column = i;
        best = score;
      }
    }
    placeCoin(column);
  }
}
const fullPile = placements.length;
const paintOrder = placements.slice().sort((a, b) => a.column - b.column);
const pileLayout = [
  {
    offsetY: 0,
    centerX: artWidth / 2,
    halfWidth: 12 * artScale,
    height: 0,
    labelTop: groundY - 7 - labelGap,
  },
];
let left = Infinity,
  right = -Infinity,
  top = Infinity,
  bottom = -Infinity;
for (const { x, y } of placements) {
  left = Math.min(left, x - coinRadiusX);
  right = Math.max(right, x + coinRadiusX);
  top = Math.min(top, y - coinRadiusY);
  bottom = Math.max(bottom, y + coinRadiusY + coinDepth);
  const height = (bottom - top) * artScale;
  pileLayout.push({
    offsetY: groundY - (bottom - artTop) * artScale,
    centerX: artInset + ((left + right) * artScale) / 2,
    halfWidth: ((right - left) * artScale) / 2,
    height,
    labelTop: groundY - height - labelGap,
  });
}

function surface(canvas, width, height, pixelRatio) {
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const ctx = canvas.getContext("2d");
  ctx.scale(pixelRatio, pixelRatio);
  return ctx;
}

function mix(a, b, weight) {
  return `color-mix(in srgb, ${a} ${weight * 100}%, ${b})`;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function coinSprite(coin, pixelRatio) {
  const canvas = document.createElement("canvas");
  const ctx = surface(canvas, 15.2 * artScale, 9 * artScale, pixelRatio);
  ctx.scale(artScale, artScale);
  ctx.translate(7.6, 3.4);
  const hot = coin.glint;
  const light = mix(coin.face, hot, 0.49);
  const shade = mix(coin.face, coin.rim, 0.44);
  const bevel = mix(coin.face, coin.rim, 0.81);
  const outline = mix(coin.rim, coin.surface, 0.53);
  const edge = ctx.createLinearGradient(-coinRadiusX, 0, coinRadiusX, 0);
  [
    [0, coin.rim],
    [0.13, shade],
    [0.25, coin.face],
    [0.33, light],
    [0.41, coin.face],
    [0.57, bevel],
    [0.73, shade],
    [0.9, coin.rim],
    [1, bevel],
  ].forEach(([stop, color]) => edge.addColorStop(stop, color));
  const body = new Path2D(`M${-coinRadiusX} 0H${coinRadiusX}V${coinDepth}
    A${coinRadiusX} ${coinRadiusY} 0 0 1 ${-coinRadiusX} ${coinDepth}Z`);
  ctx.fillStyle = edge;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = hot;
  ctx.globalAlpha = 0.29;
  for (const [x, width] of [
    [-5.56, 0.49],
    [-3.89, 0.78],
    [-2.42, 0.48],
    [-0.73, 0.69],
    [1.34, 0.55],
    [3.18, 0.66],
    [5.05, 0.4],
  ]) {
    ctx.fillRect(x, 0, width, coinDepth + coinRadiusY);
  }
  ctx.fillStyle = outline;
  ctx.globalAlpha = 0.21;
  for (const x of [-4.62, -1.56, 0.29, 2.63, 4.63])
    ctx.fillRect(x, 0, 0.42, coinDepth + coinRadiusY);
  ctx.globalAlpha = 1;
  const falloff = ctx.createLinearGradient(
    0,
    coinDepth,
    0,
    coinDepth + coinRadiusY,
  );
  falloff.addColorStop(0, "transparent");
  falloff.addColorStop(0.63, mix(coin.surface, "transparent", 0.12));
  falloff.addColorStop(1, mix(coin.surface, "transparent", 0.67));
  ctx.fillStyle = falloff;
  ctx.fillRect(-coinRadiusX, 0, coinRadiusX * 2, coinDepth + coinRadiusY);
  ctx.restore();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.22;
  ctx.stroke(body);

  const rim = ctx.createLinearGradient(-1, -coinRadiusY, 1, coinRadiusY);
  [
    [0, hot],
    [0.27, light],
    [0.53, bevel],
    [0.76, coin.face],
    [1, hot],
  ].forEach(([stop, color]) => rim.addColorStop(stop, color));
  ellipse(ctx, 0, 0, coinRadiusX, coinRadiusY);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.strokeStyle = shade;
  ctx.lineWidth = 0.15;
  ctx.stroke();

  ctx.save();
  ctx.scale(coinRadiusX - 0.35, coinRadiusY - 0.29);
  const face = ctx.createRadialGradient(-0.49, -0.59, 0.015, 0.14, 0.14, 1.27);
  [
    [0, hot],
    [0.18, light],
    [0.44, coin.face],
    [0.75, coin.face],
    [1, bevel],
  ].forEach(([stop, color]) => face.addColorStop(stop, color));
  ellipse(ctx, 0, 0, 1, 1);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    coinRadiusX - 0.1,
    coinRadiusY - 0.07,
    0,
    0.16,
    Math.PI - 0.19,
  );
  ctx.strokeStyle = hot;
  ctx.lineCap = "round";
  ctx.lineWidth = 0.33;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    coinRadiusX - 0.15,
    coinRadiusY - 0.11,
    0,
    Math.PI + 0.24,
    Math.PI * 1.58,
  );
  ctx.globalAlpha = 0.92;
  ctx.lineWidth = 0.27;
  ctx.stroke();
  return canvas;
}

const countAt = (balance) => Math.min(balance, fullPile);
const motion = () =>
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function pileLayoutAt(balance) {
  return pileLayout[countAt(balance)];
}

export function mountCoinPile(slot, art, shadows, flight, onVisible) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const paint = surface(art, restingWidth, artHeight, ratio);
  const floor = surface(shadows, restingWidth, shadowHeight, ratio);
  const air = surface(flight, flightWidth, flightHeight, ratio);
  const surfaceColor = getComputedStyle(slot)
    .getPropertyValue("--color-surface")
    .trim();
  const colors = {
    face: getComputedStyle(art).color,
    rim: getComputedStyle(shadows).color,
    glint: getComputedStyle(flight).color,
    surface: surfaceColor,
  };
  const sprite = coinSprite(colors, ratio);
  const contact = document.createElement("canvas");
  const shadow = surface(contact, 36, 36, ratio);
  const fade = shadow.createRadialGradient(18, 18, 4, 18, 18, 18);
  fade.addColorStop(0, surfaceColor);
  fade.addColorStop(0.56, mix(surfaceColor, "transparent", 0.62));
  fade.addColorStop(1, "transparent");
  shadow.fillStyle = fade;
  shadow.fillRect(0, 0, 36, 36);

  let balance;
  let painted;
  let frameId = 0;

  function drawCoin(ctx, placement, dx, dy) {
    const x = artInset + (placement.x - 7.6) * artScale + dx;
    const y = (placement.y - artTop - 3.4) * artScale + dy;
    ctx.drawImage(sprite, x, y, 15.2 * artScale, 9 * artScale);
  }

  function drawResting(shown, vacant) {
    const count = countAt(shown);
    const key = vacant ? -1 : count;
    if (key === painted) return;
    painted = key;
    const layout = pileLayout[count];
    slot.style.setProperty(
      "--pile-center",
      `${(layout.centerX / artWidth) * 100}%`,
    );
    slot.style.setProperty(
      "--pile-label-top",
      `${(layout.labelTop / artHeight) * 100}%`,
    );
    const glow = Math.sqrt(count / fullPile);
    const glowCenterY = groundY - layout.height * 0.64;
    const glowRadiusX = layout.halfWidth * 1.3;
    const glowRadiusY = layout.height * 0.8 + 7;
    slot.style.setProperty(
      "--glow-center-y",
      `${(glowCenterY / artHeight) * 100}%`,
    );
    slot.style.setProperty(
      "--glow-scale-x",
      String((2 * glowRadiusX) / artWidth),
    );
    slot.style.setProperty(
      "--glow-scale-y",
      String((2 * glowRadiusY) / artHeight),
    );
    slot.style.setProperty(
      "--glow-opacity",
      String(count ? 0.28 + 0.47 * glow : 0),
    );
    paint.clearRect(0, 0, restingWidth, artHeight);
    floor.clearRect(0, 0, restingWidth, shadowHeight);
    for (const placement of paintOrder) {
      if (placement.index >= count) continue;
      if (placement.layer === 0) {
        const x = artBleed + artInset + placement.x * artScale;
        const y =
          (stacks[placement.column].floor - artTop) * artScale + layout.offsetY;
        floor.drawImage(contact, x - 18, y - 5, 36, 13);
      }
      drawCoin(paint, placement, artBleed, layout.offsetY);
    }
    if (vacant) {
      paint.save();
      paint.globalAlpha = 0.5;
      paint.strokeStyle = colors.face;
      paint.lineWidth = 1.25;
      paint.setLineDash([3, 4]);
      ellipse(
        paint,
        artBleed + layout.centerX,
        groundY - 3,
        layout.halfWidth,
        3,
      );
      paint.stroke();
      paint.restore();
    }
  }

  function setAmount(target, showEmpty) {
    cancelAnimationFrame(frameId);
    air.clearRect(0, 0, flightWidth, flightHeight);
    function finish() {
      balance = target;
      drawResting(balance, showEmpty && !balance);
      slot.removeAttribute("data-flying");
      onVisible(target > 0);
    }
    if (
      balance === undefined ||
      target === balance ||
      !motion() ||
      !slot.getClientRects().length
    ) {
      finish();
      return;
    }

    const start = balance;
    const incoming = target > start;
    const change = Math.abs(target - start);
    const interval = 24;
    const duration = 270;
    const drifts = [-12, 11, -6, 14, -10];
    let elapsed = 0;
    let previous;
    onVisible(true);
    slot.setAttribute("data-flying", "");
    drawResting(balance, false);
    frameId = requestAnimationFrame(function frame(now) {
      if (previous !== undefined) elapsed += Math.min(now - previous, 64);
      previous = now;
      const launched = Math.min(change, Math.floor(elapsed / interval) + 1);
      const settled = Math.max(
        0,
        Math.min(change, Math.floor((elapsed - duration) / interval) + 1),
      );
      air.clearRect(0, 0, flightWidth, flightHeight);
      if (settled === change || !slot.getClientRects().length) {
        finish();
        return;
      }
      balance = start + (incoming ? settled : -launched);
      drawResting(balance, false);
      for (let i = settled; i < launched; i++) {
        const ordinal = incoming ? start + i : start - i - 1;
        const index =
          ordinal < fullPile ? ordinal : fullPile - 1 - (i % drifts.length);
        const drift = drifts[i % drifts.length];
        const rise = Math.sqrt(52 ** 2 - drift ** 2);
        const progress = (elapsed - i * interval) / duration;
        const away = incoming ? 1 - progress : progress;
        air.globalAlpha = 1 - away;
        const layout = pileLayoutAt(ordinal + 1);
        drawCoin(
          air,
          placements[index],
          flightSide + drift * away,
          flightTop + layout.offsetY - rise * away,
        );
      }
      air.globalAlpha = 1;
      frameId = requestAnimationFrame(frame);
    });
  }

  return { setAmount, dispose: () => cancelAnimationFrame(frameId) };
}

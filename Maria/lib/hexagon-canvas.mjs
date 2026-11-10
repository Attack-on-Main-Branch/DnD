import { createCanvasAnimation } from "./canvas-animation.mjs";
import {
  HEXAGON_FRAME,
  HEXAGON_RADIUS,
  HEXAGON_FACE,
  HEXAGON_SIDE,
  HEXAGON_GRID,
  HEXAGON_TILES,
  hexagonState,
} from "./hexagon-art.mjs";

const LIGHT_FRAMES = 24;
const ATLAS_COLUMNS = 5;
const PADDING = 20;
const SPRITE_SIZE = (HEXAGON_RADIUS + PADDING) * 2;

function layer(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createAtlas(color, surface, scale, face, side) {
  const size = Math.max(1, Math.ceil(SPRITE_SIZE * scale));
  const atlas = layer(
    size * ATLAS_COLUMNS,
    size * Math.ceil((LIGHT_FRAMES + 1) / ATLAS_COLUMNS),
  );
  const context = atlas.getContext("2d");
  if (!context) {
    atlas.width = atlas.height = 0;
    return null;
  }
  const unit = size / SPRITE_SIZE;
  const origin = SPRITE_SIZE / 2;
  const perimeter = HEXAGON_RADIUS * 6;

  for (let frame = 0; frame <= LIGHT_FRAMES; frame++) {
    const x = (frame % ATLAS_COLUMNS) * size;
    const y = Math.floor(frame / ATLAS_COLUMNS) * size;
    context.save();
    context.beginPath();
    context.rect(x, y, size, size);
    context.clip();
    context.setTransform(
      unit,
      0,
      0,
      unit,
      x + origin * unit,
      y + origin * unit,
    );
    context.lineJoin = "round";
    context.strokeStyle = color;
    if (frame === 0) {
      context.fillStyle = surface;
      context.fill(side);
      context.globalAlpha = 0.22;
      context.lineWidth = 1.8;
      context.stroke(side);
      context.globalAlpha = 1;
      context.fill(face);
      context.globalAlpha = 0.36;
      context.stroke(face);
    } else {
      context.fillStyle = color;
      context.globalAlpha = 0.5;
      context.fill(face);
      context.globalAlpha = 0.6;
      context.lineWidth = 1.2;
      context.stroke(face);
      context.setLineDash([perimeter * 0.27, perimeter * 0.73]);
      context.lineDashOffset = -((frame - 1) / LIGHT_FRAMES) * perimeter;
      context.lineWidth = 3.2;
      context.lineCap = "round";
      context.shadowColor = color;
      context.shadowBlur = 9 * unit;
      context.globalAlpha = 0.8;
      context.stroke(face);
      context.shadowBlur = 3 * unit;
      context.globalAlpha = 1;
      context.stroke(face);
      context.shadowBlur = 0;
      context.lineWidth = 1.4;
      context.stroke(face);
    }
    context.restore();
  }
  return { canvas: atlas, size };
}

export function createHexagonCanvas(canvas, color) {
  const surface = getComputedStyle(canvas).getPropertyValue("--color-surface");
  const face = new Path2D(HEXAGON_FACE);
  const side = new Path2D(HEXAGON_SIDE);
  const gridPath = new Path2D(HEXAGON_GRID);
  const tiles = HEXAGON_TILES.map((tile) => ({ tile }));
  let atlas = null;
  let grid = null;
  let zoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let ready = false;

  function releaseLayers() {
    if (atlas) atlas.canvas.width = atlas.canvas.height = 0;
    if (grid) grid.width = grid.height = 0;
    atlas = grid = null;
    if (ready) {
      ready = false;
      canvas.removeAttribute("data-hexagon-ready");
    }
  }

  function resize({ width, height, scale }) {
    releaseLayers();
    zoom = Math.max(width / HEXAGON_FRAME.width, height / HEXAGON_FRAME.height);
    offsetX = (width - HEXAGON_FRAME.width * zoom) / 2;
    offsetY = (height - HEXAGON_FRAME.height * zoom) / 2;
    grid = layer(canvas.width, canvas.height);
    const context = grid.getContext("2d");
    if (!context) {
      releaseLayers();
      return;
    }
    context.setTransform(
      zoom * scale,
      0,
      0,
      zoom * scale,
      offsetX * scale,
      offsetY * scale,
    );
    context.strokeStyle = color;
    context.globalAlpha = 0.3;
    context.lineWidth = 1.6;
    context.stroke(gridPath);
    atlas = createAtlas(color, surface, zoom * scale, face, side);
  }

  function paint({ context, width, height, time }) {
    if (!atlas || !grid) return;
    context.clearRect(0, 0, width, height);
    context.drawImage(grid, 0, 0, width, height);
    for (const state of tiles) hexagonState(state.tile, time, state);

    for (const state of tiles) {
      const size = SPRITE_SIZE * zoom * state.scale;
      const x = offsetX + state.x * zoom - size / 2;
      const y = offsetY + state.y * zoom - size / 2;
      if (x + size < 0 || y + size < 0 || x > width || y > height) continue;
      const { canvas: source, size: cell } = atlas;
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.drawImage(source, 0, 0, cell, cell, x, y, size, size);
      if (state.light === 0) continue;
      context.globalCompositeOperation = "lighter";
      const position = state.travel * LIGHT_FRAMES;
      const first = Math.floor(position);
      const blend = position - first;
      for (let pass = 0; pass < 2; pass++) {
        const frame = 1 + ((first + pass) % LIGHT_FRAMES);
        context.globalAlpha = state.light * (pass ? blend : 1 - blend);
        context.drawImage(
          source,
          (frame % ATLAS_COLUMNS) * cell,
          Math.floor(frame / ATLAS_COLUMNS) * cell,
          cell,
          cell,
          x,
          y,
          size,
          size,
        );
      }
    }
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
    if (!ready) {
      ready = true;
      canvas.setAttribute("data-hexagon-ready", "");
    }
  }

  return createCanvasAnimation(canvas, {
    resize,
    paint,
    dispose() {
      releaseLayers();
      tiles.length = 0;
    },
  });
}

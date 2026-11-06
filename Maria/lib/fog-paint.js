const FEATHER = 0.35;
const MIN_FEATHER_PIXELS = 8;
export const FOG_EDGE_SWAY_PIXELS = MIN_FEATHER_PIXELS / 2;

export function isFogClearForDm(pixels, offset) {
  return pixels[offset + 3] > 0 && pixels[offset] >= 128;
}

export function paintFogStroke(canvas, from, to, mode, brush, cached = null) {
  const context = canvas.getContext("2d");
  const radius = Math.max(2, (brush / 100) * canvas.width);
  const feather = Math.max(radius * FEATHER, MIN_FEATHER_PIXELS);
  const outer = mode === "hide" ? radius + feather : radius;
  const solid = mode === "hide" ? radius : Math.max(0, radius - feather);
  const start = from ?? to;
  const x = start.x * canvas.width;
  const y = start.y * canvas.height;
  const across = (to.x - start.x) * canvas.width;
  const down = (to.y - start.y) * canvas.height;
  const span = across * across + down * down;
  const left = Math.max(0, Math.floor(Math.min(x, x + across) - outer));
  const top = Math.max(0, Math.floor(Math.min(y, y + down) - outer));
  const right = Math.min(
    canvas.width,
    Math.ceil(Math.max(x, x + across) + outer),
  );
  const bottom = Math.min(
    canvas.height,
    Math.ceil(Math.max(y, y + down) + outer),
  );
  if (right <= left || bottom <= top) return;

  const width = right - left;
  const height = bottom - top;
  const pixels = cached ?? context.getImageData(left, top, width, height);
  const sourceX = cached ? left : 0;
  const sourceY = cached ? top : 0;
  const innerSquared = radius * radius;
  const solidSquared = solid * solid;
  const outerSquared = outer * outer;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const dx = left + column + 0.5 - x;
      const dy = top + row + 0.5 - y;
      const along = span
        ? Math.max(0, Math.min(1, (dx * across + dy * down) / span))
        : 0;
      const px = dx - across * along;
      const py = dy - down * along;
      const squared = px * px + py * py;
      if (squared >= outerSquared) continue;

      const inside = squared <= innerSquared;
      const fade =
        squared <= solidSquared
          ? 0
          : (Math.sqrt(squared) - solid) / (outer - solid);
      const coverage =
        fade === 0
          ? 255
          : Math.max(
              1,
              Math.min(
                254,
                Math.round(255 * (1 - fade * fade * (3 - 2 * fade))),
              ),
            );
      const at = ((row + sourceY) * pixels.width + column + sourceX) * 4;
      const clearForDm = inside
        ? mode !== "hide"
        : isFogClearForDm(pixels.data, at);
      // Max/min coverage keeps repeated passes from hardening the feather.
      pixels.data[at + 3] = !clearForDm
        ? 0
        : mode === "hide"
          ? Math.min(pixels.data[at + 3], 255 - coverage)
          : Math.max(pixels.data[at + 3], coverage);
      // RGB records the DM's solid boundary; alpha carries the player's feather.
      pixels.data[at] =
        pixels.data[at + 1] =
        pixels.data[at + 2] =
          clearForDm && pixels.data[at + 3] > 0 ? 255 : 0;
    }
  }
  if (cached) context.putImageData(pixels, 0, 0, left, top, width, height);
  else context.putImageData(pixels, left, top);
  return {
    dirty: { x: left, y: top, width, height },
    pixels,
    sourceX,
    sourceY,
  };
}

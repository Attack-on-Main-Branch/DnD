const TEXTURE_SIZE = 128;
const OCTAVES = [4, 8, 16, 32];

export function createFogTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const tint = context.getImageData(0, 0, 1, 1).data;
  const pixels = context.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  const fields = OCTAVES.map((size) =>
    Array.from({ length: size * size }, (_, index) => {
      const value = Math.sin(index * 127.1 + size * 311.7) * 43758.5453;
      return value - Math.floor(value);
    }),
  );

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      let cloud = 0;
      let weight = 0;
      OCTAVES.forEach((size, octave) => {
        const amplitude = 0.5 ** octave;
        const across = (x / TEXTURE_SIZE) * size;
        const down = (y / TEXTURE_SIZE) * size;
        const column = Math.floor(across);
        const row = Math.floor(down);
        const u = smooth(across - column);
        const v = smooth(down - row);
        const field = fields[octave];
        const at = (dx, dy) =>
          field[((row + dy) % size) * size + ((column + dx) % size)];
        const top = at(0, 0) * (1 - u) + at(1, 0) * u;
        const bottom = at(0, 1) * (1 - u) + at(1, 1) * u;
        cloud += (top * (1 - v) + bottom * v) * amplitude;
        weight += amplitude;
      });
      const index = (y * TEXTURE_SIZE + x) * 4;
      pixels.data[index] = tint[0];
      pixels.data[index + 1] = tint[1];
      pixels.data[index + 2] = tint[2];
      pixels.data[index + 3] = Math.round((cloud / weight) ** 1.7 * 180);
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function smooth(value) {
  return value * value * (3 - 2 * value);
}

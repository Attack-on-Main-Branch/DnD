const CORE = 96;

export function createContourCleaner() {
  let labels = null;
  let queue = null;
  let disposed = false;

  return {
    clean(pixels, width, height, minimumExtent) {
      if (disposed) return;
      const count = width * height;
      if (labels?.length !== count) {
        labels = new Float32Array(count);
        queue = new Uint32Array(count);
      }
      labels.fill(-1);
      for (let start = 0; start < count; start++) {
        if (labels[start] !== -1 || pixels[start * 4] < CORE) continue;
        let head = 0;
        let tail = 1;
        queue[0] = start;
        labels[start] = -2;
        let left = width;
        let right = 0;
        let top = height;
        let bottom = 0;
        while (head < tail) {
          const at = queue[head++];
          const x = at % width;
          const y = Math.floor(at / width);
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          for (
            let row = Math.max(0, y - 1);
            row <= Math.min(height - 1, y + 1);
            row++
          ) {
            for (
              let col = Math.max(0, x - 1);
              col <= Math.min(width - 1, x + 1);
              col++
            ) {
              const next = row * width + col;
              if (labels[next] !== -1 || pixels[next * 4] < CORE) continue;
              labels[next] = -2;
              queue[tail++] = next;
            }
          }
        }
        const extent = Math.max(right - left + 1, bottom - top + 1);
        const edge =
          left === 0 ||
          right === width - 1 ||
          top === 0 ||
          bottom === height - 1;
        const progress = Math.max(0, Math.min(1, extent / minimumExtent - 1));
        const opacity = edge ? 1 : progress * progress * (3 - 2 * progress);
        for (let index = 0; index < tail; index++)
          labels[queue[index]] = opacity;
      }
      for (let at = 0; at < count; at++) {
        const channel = at * 4;
        const line = pixels[channel];
        if (!line) continue;
        let opacity = labels[at];
        if (opacity < 0) {
          opacity = 0;
          const x = at % width;
          const y = Math.floor(at / width);
          for (
            let row = Math.max(0, y - 2);
            row <= Math.min(height - 1, y + 2);
            row++
          ) {
            for (
              let col = Math.max(0, x - 2);
              col <= Math.min(width - 1, x + 2);
              col++
            ) {
              opacity = Math.max(opacity, labels[row * width + col]);
            }
          }
        }
        if (opacity < 1) pixels[channel] = Math.round(line * opacity);
      }
    },
    dispose() {
      disposed = true;
      labels = queue = null;
    },
  };
}

import { createContourCleaner } from "./contour-cleaner.mjs";

const cleaners = new Map();

self.addEventListener("message", ({ data }) => {
  const { id, pixels, width, height, minimumExtent, dispose } = data;
  if (dispose) {
    cleaners.get(id)?.dispose();
    cleaners.delete(id);
    return;
  }
  if (!cleaners.has(id)) cleaners.set(id, createContourCleaner());
  cleaners.get(id).clean(pixels, width, height, minimumExtent);
  self.postMessage({ id, pixels }, [pixels.buffer]);
});

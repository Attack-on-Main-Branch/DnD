/**
 * Shrinking a map in the browser, before it reaches the network — a 4000px PNG
 * export costs the upload, the bucket, and every later page view.
 *
 * Browser only: uses `createImageBitmap` and a canvas, so this module must not
 * be imported by a Server Component.
 */

/** Above this, on the longest edge, the image is scaled down. */
export const MAX_EDGE = 2560;

/**
 * High for WebP, because a map is read at 100% rather than glanced at, and 0.75
 * leaves visible mush on hand-drawn linework. Almost all of the saving comes
 * from the resize anyway.
 */
export const QUALITY = 0.9;

/**
 * Always resolves with a usable file: if the re-encode fails or comes out
 * worse, the original is returned with `changed: false`.
 */
export async function compressImage(file, { maxEdge, quality } = {}) {
  const edge = maxEdge ?? MAX_EDGE;
  const q = quality ?? QUALITY;
  const unchanged = (extra) => ({
    file,
    originalBytes: file.size,
    bytes: file.size,
    changed: false,
    ...extra,
  });

  if (!file?.type?.startsWith("image/")) {
    return unchanged({ width: 0, height: 0 });
  }

  let bitmap;

  try {
    bitmap = await decode(file);
  } catch {
    // Validation's answer to give, not this function's.
    return unchanged({ width: 0, height: 0 });
  }

  const { width, height } = fit(bitmap.width, bitmap.height, edge);

  try {
    const blob = await encodeWebp(bitmap, width, height, q);

    /*
     * Re-encoding does not always win: a 4000×2500 map of flat colour blocks
     * measured 284KB as a PNG against 410KB as a 2560px WebP, so keying this on
     * "did we resize" stored some files larger AND at lower resolution. Bytes
     * are what the bucket is charged for, and a tie keeps the original.
     */
    if (blob.size >= file.size) {
      return unchanged({ width: bitmap.width, height: bitmap.height });
    }

    return {
      file: new File([blob], toWebpName(file.name), {
        type: "image/webp",
        lastModified: file.lastModified,
      }),
      width,
      height,
      originalBytes: file.size,
      bytes: blob.size,
      changed: true,
    };
  } catch {
    return unchanged({ width: bitmap.width, height: bitmap.height });
  } finally {
    bitmap.close?.();
  }
}

/**
 * `createImageBitmap` decodes off the main thread, which on a 4000px PNG is the
 * difference between a dropped frame and a frozen page. The `<img>` fallback is
 * for Safari; its object URL must be revoked, or the decoded image is held for
 * the life of the document.
 */
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode the image"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The longest edge down to `maxEdge`, keeping the aspect ratio. */
function fit(width, height, maxEdge) {
  const longest = Math.max(width, height);

  if (longest <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / longest;

  // At least 1px on the short edge: a 4000×1 strip would otherwise round to a
  // zero-height canvas, which throws rather than producing a thin image.
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function encodeWebp(source, width, height, quality) {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    draw(canvas, source, width, height);

    return canvas.convertToBlob({ type: "image/webp", quality });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas, source, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // `toBlob` hands back null when the type is unsupported, rather than
        // throwing — and silently falling back to PNG would defeat the point.
        if (blob && blob.type === "image/webp") {
          resolve(blob);
          return;
        }

        reject(new Error("This browser cannot encode WebP"));
      },
      "image/webp",
      quality,
    );
  });
}

function draw(canvas, source, width, height) {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not get a 2D context");
  }

  // Downscaling in one step aliases hand-drawn linework badly; this is the
  // browser's own multi-step filter and costs nothing to ask for.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
}

function toWebpName(name) {
  const base = String(name || "map").replace(/\.[^.]+$/, "");

  // Not the storage key — `mapObjectPath` names the object. Sanitised anyway,
  // because this travels in the multipart body's `filename` parameter, and a
  // header value is not the place to pass on whatever the file picker gave.
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);

  return `${safe || "map"}.webp`;
}

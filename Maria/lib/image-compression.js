/**
 * Shrinking a map in the browser, before it ever reaches the network.
 *
 * A battle map arrives as whatever the DM exported — commonly a 4000px PNG of
 * several megabytes. Sending that costs the upload, the bucket, and every
 * later page view; re-encoded to WebP at 2560px it is usually a tenth of the
 * size with nothing visible lost. Doing it here rather than on the server also
 * means the bytes that never existed are never paid for anywhere.
 *
 * Browser only. It uses `createImageBitmap` and a canvas, neither of which the
 * server has, so this module must not be imported by a Server Component.
 */

/** Above this, on the longest edge, the image is scaled down. */
export const MAX_EDGE = 2560;

/**
 * 0.9, which is high for WebP.
 *
 * A map is read at 100% and scrolled around, not glanced at in a feed, so the
 * usual 0.75 leaves visible mush on hand-drawn linework and text labels. The
 * saving from 0.9 to 0.75 is small next to the saving from the resize, which is
 * where almost all of it comes from.
 */
export const QUALITY = 0.9;

/**
 * @param {File} file
 * @param {{maxEdge?: number, quality?: number}} [options]
 * @returns {Promise<{file: File, width: number, height: number,
 *   originalBytes: number, bytes: number, changed: boolean}>}
 *
 * Always resolves with a usable file. If anything about the re-encode goes
 * wrong, or comes out worse, the original is returned with `changed: false` —
 * a map that uploads at full size is a far better outcome than one that does
 * not upload at all.
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
    // A file the browser will not decode is one the server would not have
    // liked either, but that is validation's answer to give, not this
    // function's.
    return unchanged({ width: 0, height: 0 });
  }

  const { width, height } = fit(bitmap.width, bitmap.height, edge);

  try {
    const blob = await encodeWebp(bitmap, width, height, q);

    /*
     * Re-encoding does not always win, and the resize does not guarantee it.
     *
     * Measured: a 4000×2500 map of flat colour blocks is 284KB as a PNG and
     * 410KB as a 2560px WebP — lossless compression is very good at large flat
     * areas, and lossy encoding of many hues is not. An earlier version of this
     * guard only kept the original when no resize had happened, so that file
     * would have been stored 44% larger AND at 64% of its resolution: worse on
     * both counts.
     *
     * So the rule is bytes, which is what the bucket and every later page view
     * are actually charged for. Smaller wins; a tie keeps the original, because
     * the original is the one nobody has re-encoded.
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
 * `createImageBitmap` where it exists, an `<img>` where it does not.
 *
 * The bitmap path decodes off the main thread, which on a 4000px PNG is the
 * difference between a dropped frame or two and a visibly frozen page. The
 * fallback exists because Safari only gained the File overload comparatively
 * recently, and the object URL is revoked either way — an un-revoked one holds
 * the whole decoded image for the life of the document.
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

  // This is the File's name, not the storage key — the object is named after
  // the campaign by `mapObjectPath`. It still gets sanitised, because the name
  // is what travels in the multipart body's `filename` parameter, and a header
  // value is not the place to pass on whatever was in the file picker.
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);

  return `${safe || "map"}.webp`;
}

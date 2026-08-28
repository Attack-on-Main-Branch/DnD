/**
 * Shrinking a picture in the browser, before it reaches the network — a 4000px
 * PNG export costs the upload, the bucket, and every later page view.
 *
 * Browser only: uses `createImageBitmap` and a canvas, so this module must not
 * be imported by a Server Component.
 */

/**
 * Above this, on the longest edge, a map is scaled down.
 *
 * A battle map is read at 100% and pinch-zoomed into, so the ceiling is the
 * picture's own rather than the screen's. It is not the binding limit —
 * `MAX_MAP_BYTES` is, and `compressMap` below is what reconciles the two.
 */
export const MAX_EDGE = 4096;

/**
 * Where a picture that would not fit under its byte cap is tried again: five
 * eighths of its own ceiling.
 *
 * A RATIO AND NOT A LENGTH, so every kind of picture gets the retry rather than
 * only the one it was written for. Five eighths of a map's 4096 is the 2560 this
 * was a hard-coded constant for, and the reason for that number is measured: a
 * 6000px hand-drawn map re-encodes to something over `MAX_MAP_BYTES` at 4096 and
 * comfortably under it at 2560.
 */
const FALLBACK_RATIO = 0.625;

/**
 * The same, for a portrait. Small because of where one is looked at: the
 * biggest an avatar is ever drawn is 80px, and 512 leaves room for a retina
 * screen and for wherever a face is shown larger later.
 *
 * The picture is NOT cropped square on the way through. Every avatar renders
 * under `object-cover` inside a circle, so the crop is the browser's and a
 * portrait that is retaken keeps whatever the file had.
 */
export const AVATAR_EDGE = 512;

/**
 * High for WebP, because a map is read at 100% rather than glanced at, and 0.75
 * leaves visible mush on hand-drawn linework. Almost all of the saving comes
 * from the resize anyway.
 */
export const QUALITY = 0.9;

/**
 * A picture re-encoded to fit under a byte cap: at its own ceiling first, and at
 * `FALLBACK_RATIO` of it if that did not fit.
 *
 * THE CEILING AND THE CAP ARE TWO DIFFERENT PROMISES, and only the second is
 * enforced by anything. Reporting a miss as a refusal would be telling somebody
 * their picture is too big when what is actually true is that this page did not
 * try hard enough — which is exactly what happened to the campaign sheet the day
 * `MAX_EDGE` went from 2560 to 4096 and that one caller kept encoding once. A
 * 26MB map that used to arrive at 1.8MB started arriving at 4.7MB and being
 * refused for it.
 *
 * SO EVERY KIND OF PICTURE GOES THROUGH HERE, and the three below are the same
 * routine with their own ceiling. A caller that passes no cap gets one pass, as
 * before.
 *
 * One retry and no more: a file still over its cap at five eighths is one there
 * is genuinely nothing to be done about from here, and the caller says so.
 */
async function compressToFit(file, maxEdge, byteCap) {
  const full = await compressImage(file, { maxEdge });

  if (full.decodable === false || !byteCap || full.file.size <= byteCap) {
    return full;
  }

  const smaller = await compressImage(file, {
    maxEdge: Math.round(maxEdge * FALLBACK_RATIO),
  });

  return smaller.file.size < full.file.size ? smaller : full;
}

/** A map, at the largest edge worth keeping. */
export function compressMap(file, byteCap) {
  return compressToFit(file, MAX_EDGE, byteCap);
}

/** A portrait, at the size a face is worth storing. */
export function compressAvatar(file, byteCap) {
  return compressToFit(file, AVATAR_EDGE, byteCap);
}

/**
 * A piece on the board, at the size one is ever drawn: a token covers a single
 * hexagon, which is never wider than a portrait's own ceiling.
 */
export function compressToken(file, byteCap) {
  return compressToFit(file, AVATAR_EDGE, byteCap);
}

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

  // `decodable: false` on the two paths that never produced a bitmap, and only
  // those: the encode-side catches below hand back a file that decoded fine,
  // where keeping the original is the right answer rather than a fault. Without
  // the flag the caller cannot tell "already optimal" from "unreadable", and a
  // corrupt image is uploaded and rendered broken.
  if (!file?.type?.startsWith("image/")) {
    return unchanged({ width: 0, height: 0, decodable: false });
  }

  let bitmap;

  try {
    bitmap = await decode(file);
  } catch {
    return unchanged({ width: 0, height: 0, decodable: false });
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
  const base = String(name || "picture").replace(/\.[^.]+$/, "");

  // Not the storage key — `mapObjectPath` and `avatarObjectPath` name the
  // object. Sanitised anyway, because this travels in the multipart body's
  // `filename` parameter, and a header value is not the place to pass on
  // whatever the file picker gave.
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60);

  return `${safe || "picture"}.webp`;
}

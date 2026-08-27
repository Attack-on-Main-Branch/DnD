/**
 * What a picture uploaded to this app is, and where it goes in a bucket. A map
 * and a portrait agree about all of it, so it is decided once. Nothing here
 * touches storage itself.
 */

/** The browser sends WebP, but these rules also run against requests not
    built with our forms, so the other three stay accepted. */
const ACCEPTED_IMAGE_TYPES = [
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/gif",
];

/** For a file picker's `accept`, which takes a comma-separated list. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

export function isAcceptedImage(type) {
  return ACCEPTED_IMAGE_TYPES.includes(type);
}

/** Duck-typed: a file that crossed a realm boundary, as a parsed multipart
    body has, fails `instanceof` silently and looks like nothing chosen. */
export function isUploadedFile(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number" &&
    value.size > 0 &&
    typeof value.name === "string" &&
    value.name !== ""
  );
}

export function imageExtension(type) {
  switch (type) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    default:
      return "webp";
  }
}

/** The storage path back out of a public URL, or null if it is not ours. */
export function pathFromPublicUrl(url, bucket) {
  if (typeof url !== "string") {
    return null;
  }

  const marker = `/${bucket}/`;
  const at = url.indexOf(marker);

  if (at === -1) {
    return null;
  }

  const path = url.slice(at + marker.length);

  // Nothing that could climb out of the bucket: this is about to name an object
  // for deletion, which is not a place to take a string on trust.
  return path && !path.includes("..") ? decodeURIComponent(path) : null;
}

/** `4 MB`, `820 KB`. */
export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  return kb < 1024 ? `${Math.round(kb)} KB` : `${round(kb / 1024, 1)} MB`;
}

function round(value, places) {
  const factor = 10 ** places;

  return Math.round(value * factor) / factor;
}

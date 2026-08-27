/**
 * The two things this app puts in a bucket — a campaign's map and a character's
 * portrait — reach Storage through here.
 *
 * Storage speaks HTTP rather than SQLSTATE, so the classification is string
 * matching. `subject` names the caller's reason codes: `map_denied` against
 * `avatar_denied`, because Maria's copy for the two is not the same sentence.
 */

/** One year: a replacement is a new path, never the same URL. */
const IMMUTABLE_SECONDS = 31536000;

function classifyStorage(error, subject) {
  const status = Number(error.statusCode ?? error.status);
  const message = String(error.message ?? "").toLowerCase();

  if (status === 404 || message.includes("bucket not found")) {
    return "missing_bucket";
  }

  if (status === 409 || message.includes("already exists")) {
    return `${subject}_exists`;
  }

  if (status === 401 || status === 403 || message.includes("row-level")) {
    return `${subject}_denied`;
  }

  if (status === 413 || message.includes("maximum allowed size")) {
    return `${subject}_too_large`;
  }

  return `${subject}_failed`;
}

/**
 * `upsert: false` because every path carries a fresh name, so something already
 * there is a reused id. `contentType` is explicit: Storage otherwise infers it
 * from the extension, and a FormData filename need not match.
 */
export async function uploadObject(supabase, { bucket, path, file, subject }) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
    cacheControl: `${IMMUTABLE_SECONDS}`,
  });

  if (error) {
    return {
      data: null,
      error: { reason: classifyStorage(error, subject), detail: error.message },
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return { data: { url: data.publicUrl, path }, error: null };
}

/**
 * Cleanup for an object whose row is gone or never got written. Best-effort for
 * the caller, but it reports: a storage client returns `{ error }` rather than
 * throwing, and swallowing that leaves orphans nobody can see.
 */
export async function removeObject(supabase, { bucket, path, subject }) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    return error
      ? {
          error: {
            reason: classifyStorage(error, subject),
            detail: error.message,
          },
        }
      : { error: null };
  } catch (thrown) {
    return { error: { reason: `${subject}_failed`, detail: String(thrown) } };
  }
}

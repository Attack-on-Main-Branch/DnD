export async function setBannerSkin(supabase, { id, skin }) {
  const { data, error } = await supabase.rpc("set_banner_skin", {
    target_id: id,
    target_kind: "character",
    new_skin: skin,
  });

  if (error) {
    const reason = error.message?.includes("banner_skin_locked")
      ? "skin_locked"
      : error.code === "23503" || error.code === "23514"
        ? "invalid_skin"
        : error.code === "22P02"
          ? "bad_id"
          : "unknown";
    return { data: null, error: { reason, detail: error.message } };
  }

  return data
    ? { data: true, error: null }
    : { data: null, error: { reason: "not_found", detail: null } };
}

"use server";

import { revalidatePath } from "next/cache";
import { setBannerSkin } from "sina/data/skins";
import { validateBannerSkin } from "sina/rules/skins";

import { logUncovered } from "@/lib/errors";
import { rejected, sessionRejection } from "@/lib/rejection";
import { characterSheetPath } from "@/lib/routes";
import { createClient, getCurrentUser } from "@/lib/supabase";

const BANNER_COPY = {
  skin_locked:
    "That banner has not been found yet. Open a Pouch at the table to find more.",
  invalid_skin: "Choose a banner style.",
  bad_id: "That sheet could not be found.",
  not_found: "That sheet is no longer yours to change.",
};

export async function saveBannerSkin(id, skin) {
  if (typeof id !== "string" || !id) {
    return rejected(BANNER_COPY.bad_id);
  }
  if (validateBannerSkin(skin))
    return rejected(BANNER_COPY.invalid_skin, "bannerSkin");

  const supabase = await createClient();
  const { user, error: authError } = await getCurrentUser(supabase);
  if (authError || !user) return sessionRejection("saveBannerSkin", authError);

  const { error } = await setBannerSkin(supabase, { id, skin });
  if (error) {
    const copy = BANNER_COPY[error.reason];
    logUncovered("saveBannerSkin", error, copy);
    return rejected(copy ?? "Could not save the banner. Please try again.");
  }

  revalidatePath(characterSheetPath(id));
  return { kind: "success" };
}

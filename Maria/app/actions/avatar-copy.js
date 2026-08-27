/**
 * What a portrait's storage failure says, for the two sheets that can upload
 * one — the creation panel's action and the edit sheet's.
 *
 * Its own module and not a constant beside either of them: a `"use server"`
 * file may only export async functions, so a shared map has nowhere to live
 * inside one. Spread into each action's own `*_COPY`, which is where the rest
 * of that sheet's wording stays.
 *
 * The field is named on every entry so the message lands on the circle it is
 * about rather than at the foot of the form.
 */
export const AVATAR_COPY = {
  missing_bucket: {
    message:
      "The character-avatars storage bucket does not exist yet. Run the migrations in Sina/supabase/migrations.",
    field: "avatar",
  },
  avatar_denied: {
    message: "The portrait could not be uploaded: storage refused the request.",
    field: "avatar",
  },
  avatar_too_large: {
    message: "Storage refused the portrait for being too large.",
    field: "avatar",
  },
  avatar_exists: {
    message: "A portrait is already stored under that name. Try again.",
    field: "avatar",
  },
  avatar_failed: {
    message: "The portrait could not be uploaded. Try again in a moment.",
    field: "avatar",
  },
};

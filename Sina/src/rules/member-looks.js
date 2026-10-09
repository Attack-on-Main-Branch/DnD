/**
 * How a party member looks, as their Dungeon Master describes them for the scene
 * painter. Bounds mirror 20261005121000_how_they_look.sql.
 */

import {
  formatBytes,
  imageExtension,
  IMAGE_ACCEPT_ATTRIBUTE,
  isAcceptedImage,
  isUploadedFile,
  pathFromPublicUrl,
} from "./images.js";
import { countCharacters, readProse } from "./text.js";

export { formatBytes };

export const LOOK_ACCEPT_ATTRIBUTE = IMAGE_ACCEPT_ATTRIBUTE;

/** A 1024px reference: enough detail for a face, well under the body limit. */
export const MAX_LOOK_IMAGE_BYTES = 1024 * 1024;

/** Mirrored by `campaign_member_looks_description_check`. */
export const MAX_LOOK_DESCRIPTION_LENGTH = 300;

const LOOK_BUCKET = "campaign-maps";

/** The first segment is the owner's uid; the bucket's policy checks it. A fresh
    stamp per upload, since objects are cached for a year. */
export function lookImageObjectPath({
  userId,
  campaignId,
  characterId,
  type,
  stamp,
}) {
  return `${userId}/${campaignId}-look-${characterId}-${stamp}.${imageExtension(type)}`;
}

export function lookImagePathFromUrl(url) {
  return pathFromPublicUrl(url, LOOK_BUCKET);
}

/** No file keeps the picture already there. */
export function validateMemberLook({ description, image }) {
  const errors = {};
  const words = readProse(description);

  if (countCharacters(words) > MAX_LOOK_DESCRIPTION_LENGTH) {
    errors.description = `A description is at most ${MAX_LOOK_DESCRIPTION_LENGTH} characters.`;
  }

  const hasImage = isUploadedFile(image);

  if (hasImage && !isAcceptedImage(image.type)) {
    errors.image = "That file is not a picture we can use.";
  } else if (hasImage && image.size > MAX_LOOK_IMAGE_BYTES) {
    errors.image = `The picture must be under ${formatBytes(
      MAX_LOOK_IMAGE_BYTES,
    )} once compressed.`;
  }

  return Object.keys(errors).length > 0
    ? { values: null, errors }
    : {
        values: { description: words || null, image: hasImage ? image : null },
        errors: null,
      };
}

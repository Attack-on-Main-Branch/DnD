import { listCampaignMaps, listPartyMembers } from "sina/data/campaigns";
import { listPartyInventory } from "sina/data/inventory";
import { listMemberLooks } from "sina/data/member-looks";
import {
  hangScene,
  listSceneStaging,
  removeScene,
  uploadScene,
} from "sina/data/scenes";
import {
  listCampaignTokenTemplates,
  listMapPlacedTokens,
} from "sina/data/tokens";
import { classLabel } from "sina/rules/character";
import { characterSize } from "sina/rules/character-stats";
import { readGridSettings } from "sina/rules/grid";
import {
  composeSceneRequest,
  layoutSketchSvg,
  readSceneCamera,
  SCENE_ASPECT,
  SCENE_IMAGE_SIZE,
  SCENE_SYSTEM_PROMPT,
  sceneName,
  sceneObjectPath,
  scenePathFromUrl,
} from "sina/rules/scene";
import { readPlacedToken } from "sina/rules/tokens";
import { paintWithVertex } from "sina/services/vertex";

import { logFailure } from "@/lib/errors";
import {
  fetchStorageImage,
  layoutSketch,
  prepareMap,
  prepareReference,
  toSceneWebp,
} from "@/lib/scene-pictures";

/**
 * One scene, from the board as the database holds it to a picture on the shelf.
 * Every read goes through the Dungeon Master's own client, so RLS decides what
 * the painter may be told. Answers `{ data: { id } }` or `{ error: { reason } }`.
 */
export async function paintSceneFor(
  supabase,
  { campaignId, mapId, userId, painter },
) {
  const [maps, staging, placed, templates, party, looks] = await Promise.all([
    listCampaignMaps(supabase, campaignId),
    listSceneStaging(supabase, campaignId),
    listMapPlacedTokens(supabase, [mapId]),
    listCampaignTokenTemplates(supabase, campaignId),
    listPartyMembers(supabase, campaignId),
    listMemberLooks(supabase, campaignId),
  ]);

  const failed = [maps, staging, placed, templates, party, looks].find(
    (read) => read.error,
  );

  if (failed) {
    return { error: failed.error };
  }

  const map = maps.data.find(
    (one) => one.id === mapId && !one.is_world_map && !one.is_scene,
  );

  if (!map) {
    return { error: { reason: "not_found", detail: null } };
  }

  const camera = readSceneCamera(
    staging.data.cameras.find((one) => one.map_id === mapId),
  );

  if (!camera) {
    return { error: { reason: "no_camera", detail: null } };
  }

  const packs = await listPartyInventory(
    supabase,
    party.data.map((member) => member.id),
  );

  if (packs.error) {
    logFailure("paintScene/packs", packs.error);
  }

  const pieces = describeBoard({
    placed: placed.data,
    templates: templates.data,
    members: party.data,
    looks: looks.data,
    held: packs.error ? [] : packs.data.filter((row) => row.in_hand),
    directions: staging.data.directions,
  });

  const mapBytes = await fetchStorageImage(map.url);
  const picture = mapBytes && (await prepareMap(mapBytes).catch(() => null));

  if (!picture) {
    return { error: { reason: "map_unreadable", detail: map.url } };
  }

  const { parts, marks } = composeSceneRequest({
    camera,
    natural: picture.natural,
    gridSize: readGridSettings(map).size,
    mapName: map.name,
    pieces,
  });

  const sketch = await layoutSketch(
    picture,
    layoutSketchSvg({
      width: picture.width,
      height: picture.height,
      camera,
      marks,
    }),
  );

  const request = await resolveParts(parts, sketch);

  const painted = await paintWithVertex({
    credentials: painter.credentials,
    subjectToken: painter.subjectToken,
    project: painter.project,
    location: painter.location,
    model: painter.model,
    systemInstruction: SCENE_SYSTEM_PROMPT,
    parts: request,
    aspectRatio: SCENE_ASPECT,
    imageSize: SCENE_IMAGE_SIZE,
  });

  if (painted.error) {
    return { error: painted.error };
  }

  const webp = await toSceneWebp(painted.data.bytes).catch(() => null);

  if (!webp) {
    return { error: { reason: "scene_unreadable", detail: null } };
  }

  return hang(supabase, { campaignId, userId, map, webp });
}

function describeBoard({
  placed,
  templates,
  members,
  looks,
  held,
  directions,
}) {
  const pieces = [];

  for (const row of placed) {
    const token = readPlacedToken(row);

    if (!token || token.isPartyMarker) {
      continue;
    }

    const direction =
      directions.find((one) => one.token_id === token.id)?.direction ?? null;

    if (token.characterId) {
      const member = members.find((one) => one.id === token.characterId);

      if (!member) {
        continue;
      }

      const look = looks.find((one) => one.character_id === member.id);
      const holding = held.find((one) => one.character_id === member.id);

      pieces.push({
        id: token.id,
        kind: "character",
        name: member.name,
        race: member.race,
        path: classLabel(member.class_id),
        size: characterSize(member.race),
        description: look?.description ?? null,
        holding: holding
          ? { name: holding.name, description: holding.description }
          : null,
        direction,
        isHidden: token.isHidden,
        isDead: Boolean(member.is_dead),
        conditions: member.conditions ?? [],
        imageUrl: look?.image_url ?? member.avatar_url ?? null,
        x: token.x,
        y: token.y,
      });

      continue;
    }

    const template = templates.find((one) => one.id === token.templateId);

    if (!template) {
      continue;
    }

    pieces.push({
      id: token.id,
      kind: "creature",
      name: template.name,
      templateId: template.id,
      ringColor: token.ringColor,
      direction,
      isHidden: token.isHidden,
      isDead: token.isDead,
      conditions: token.conditions,
      imageUrl: template.image_url,
      x: token.x,
      y: token.y,
    });
  }

  return pieces;
}

/** A reference that will not load is dropped with the label naming it. */
async function resolveParts(parts, sketch) {
  const urls = [
    ...new Set(
      parts
        .filter((part) => part.source === "reference")
        .map((part) => part.url),
    ),
  ];

  const loaded = new Map(
    await Promise.all(
      urls.map(async (url) => {
        const bytes = await fetchStorageImage(url);

        return [url, bytes && (await prepareReference(bytes))];
      }),
    ),
  );

  const resolved = [];

  for (const part of parts) {
    if (part.kind === "text") {
      resolved.push({ text: part.text });
      continue;
    }

    const bytes = part.source === "sketch" ? sketch : loaded.get(part.url);

    if (!bytes) {
      resolved.pop();
      continue;
    }

    resolved.push({ mimeType: "image/jpeg", data: bytes.toString("base64") });
  }

  return resolved;
}

/** Object first, then the row; the object goes again if the row is refused. */
async function hang(supabase, { campaignId, userId, map, webp }) {
  const id = crypto.randomUUID();
  const path = sceneObjectPath({ userId, campaignId, sceneId: id });
  const file = new File([webp], `${id}.webp`, { type: "image/webp" });

  const upload = await uploadScene(supabase, { path, file });

  if (upload.error) {
    return { error: upload.error };
  }

  const hung = await hangScene(supabase, {
    campaignId,
    id,
    name: sceneName(map.name),
    url: upload.data.url,
  });

  if (hung.error) {
    await sweep(supabase, upload.data.url, "paintScene/rollback");

    return { error: hung.error };
  }

  for (const url of hung.data.evicted) {
    await sweep(supabase, url, "paintScene/evict");
  }

  return { data: { id } };
}

async function sweep(supabase, url, where) {
  const path = scenePathFromUrl(url);

  if (!path) {
    return;
  }

  const cleanup = await removeScene(supabase, path);

  if (cleanup.error) {
    logFailure(where, cleanup.error);
  }
}

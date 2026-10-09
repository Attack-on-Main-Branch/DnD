/**
 * A scene painted from a camera on the board: geometry and prompt only. Runs in
 * the browser too. Bounds mirror 20261005120000_a_camera_on_the_table.sql.
 */

import { CONDITIONS } from "./conditions.js";
import { clampGridSize, FEET_PER_HEX } from "./grid.js";
import { pathFromPublicUrl } from "./images.js";
import { countCharacters, readProse } from "./text.js";

/** Mirrored by `hang_scene`. */
export const MAX_SCENES = 4;

export const SCENE_FIELD_OF_VIEW = 70;
export const SCENE_EYE_HEIGHT_FT = 5.5;

/** Mirrored by `scene_directions_text_check`. */
export const MAX_DIRECTION_LENGTH = 200;

/** Mirrored by `scene_cameras_note_check`. */
export const MAX_SCENE_NOTE_LENGTH = 300;

export const MAX_SCENE_IMAGES = 14;

/** MAX_MAP_BYTES: a scene hangs on the same shelf. */
export const MAX_SCENE_BYTES = 4 * 1024 * 1024;

export const SCENE_ASPECT = "16:9";
export const SCENE_IMAGE_SIZE = "2K";

const SCENE_BUCKET = "campaign-maps";
const REFERENCE_BUCKETS = ["campaign-maps", "character-avatars"];

const AHEAD_DEGREES = 5;
const VIEW_MARGIN_DEGREES = 5;
const NEAREST_FEET = 1;
const CAMERA_COLOR = "#facc15";

/** Degrees clockwise from the top of the picture, in [0, 360). */
export function normaliseFacing(value) {
  const degrees = Number(value);

  if (!Number.isFinite(degrees)) {
    return 0;
  }

  const turned = Math.round((((degrees % 360) + 360) % 360) * 10) / 10;

  // 359.97 rounds up to 360, which the CHECK refuses.
  return turned >= 360 ? 0 : turned;
}

function fraction(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

export function readSceneCamera(row) {
  const mapId = row?.map_id ?? row?.mapId;
  const x = fraction(row?.world_x ?? row?.x);
  const y = fraction(row?.world_y ?? row?.y);

  if (typeof mapId !== "string" || !mapId || x === null || y === null) {
    return null;
  }

  const note = readProse(row?.note);

  return {
    mapId,
    x,
    y,
    facing: normaliseFacing(row?.facing),
    note: note || null,
  };
}

export function validateSceneCamera({ x, y, facing, note }) {
  const errors = {};
  const atX = fraction(x);
  const atY = fraction(y);
  const moment = readProse(note);

  if (atX === null || atY === null) {
    errors.point = "The camera has to stand on the map.";
  }

  if (countCharacters(moment) > MAX_SCENE_NOTE_LENGTH) {
    errors.note = `The moment is at most ${MAX_SCENE_NOTE_LENGTH} characters.`;
  }

  return Object.keys(errors).length > 0
    ? { values: null, errors }
    : {
        values: {
          x: atX,
          y: atY,
          facing: normaliseFacing(facing),
          note: moment || null,
        },
        errors: null,
      };
}

/** An empty direction removes it. */
export function validateDirection(value) {
  const direction = readProse(value);

  if (countCharacters(direction) > MAX_DIRECTION_LENGTH) {
    return {
      value: null,
      error: `A direction is at most ${MAX_DIRECTION_LENGTH} characters.`,
    };
  }

  return { value: direction, error: null };
}

/** Adjacent pointy-topped hex centres are `sqrt(3) · size` apart, one hex each.
    Applies whether or not the grid is drawn. */
export function feetPerPixel(gridSize) {
  return FEET_PER_HEX / (Math.sqrt(3) * clampGridSize(gridSize));
}

export function bearingBetween(from, to, natural) {
  const dx = (to.x - from.x) * natural.width;
  const dy = (to.y - from.y) * natural.height;

  return normaliseFacing((Math.atan2(dx, -dy) * 180) / Math.PI);
}

/** `bearingDeg` is off the frame's centre line, negative to the left. */
export function sightOf({ camera, natural, gridSize, point }) {
  if (!camera || !natural?.width || !natural?.height || !point) {
    return { inView: false, distanceFt: null, bearingDeg: null };
  }

  const dx = (point.x - camera.x) * natural.width;
  const dy = (point.y - camera.y) * natural.height;
  const distanceFt = Math.hypot(dx, dy) * feetPerPixel(gridSize);

  const bearing = bearingBetween(camera, point, natural);
  const bearingDeg = ((bearing - camera.facing + 540) % 360) - 180;

  return {
    inView:
      distanceFt >= NEAREST_FEET &&
      Math.abs(bearingDeg) <= SCENE_FIELD_OF_VIEW / 2 + VIEW_MARGIN_DEGREES,
    distanceFt,
    bearingDeg,
  };
}

export function facingTowards(camera, points, natural) {
  if (!points?.length || !natural?.width) {
    return 0;
  }

  const middle = {
    x: points.reduce((sum, one) => sum + one.x, 0) / points.length,
    y: points.reduce((sum, one) => sum + one.y, 0) / points.length,
  };

  if (middle.x === camera.x && middle.y === camera.y) {
    return 0;
  }

  return bearingBetween(camera, middle, natural);
}

/** Seven-segment digits rather than <text>: the server rendering the sketch
    may have no fonts installed. */
const SEGMENTS = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgedc",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
};

function segmentLine(segment, x, y, w, h) {
  switch (segment) {
    case "a":
      return [x, y, x + w, y];
    case "b":
      return [x + w, y, x + w, y + h / 2];
    case "c":
      return [x + w, y + h / 2, x + w, y + h];
    case "d":
      return [x, y + h, x + w, y + h];
    case "e":
      return [x, y + h / 2, x, y + h];
    case "f":
      return [x, y, x, y + h / 2];
    default:
      return [x, y + h / 2, x + w, y + h / 2];
  }
}

function numeral(value, cx, cy, size) {
  const digits = String(value).split("");
  const w = size * 0.5;
  const gap = size * 0.25;
  const total = digits.length * w + (digits.length - 1) * gap;
  const top = cy - size / 2;
  let left = cx - total / 2;
  const lines = [];

  for (const digit of digits) {
    for (const segment of SEGMENTS[digit] ?? "") {
      const [x1, y1, x2, y2] = segmentLine(segment, left, top, w, size);

      lines.push(
        `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}"/>`,
      );
    }

    left += w + gap;
  }

  return `<g stroke="#ffffff" stroke-width="${round(size * 0.16)}" stroke-linecap="round">${lines.join("")}</g>`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function hexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : "#ef4444";
}

/** `width`/`height` are the pixels it is laid over; points are fractions. */
export function layoutSketchSvg({ width, height, camera, marks }) {
  const short = Math.min(width, height);
  const reach = Math.hypot(width, height);
  const cx = camera.x * width;
  const cy = camera.y * height;

  const edge = (offset) => {
    const angle = ((camera.facing + offset) * Math.PI) / 180;

    return [cx + Math.sin(angle) * reach, cy - Math.cos(angle) * reach];
  };

  const [lx, ly] = edge(-SCENE_FIELD_OF_VIEW / 2);
  const [rx, ry] = edge(SCENE_FIELD_OF_VIEW / 2);
  const [ax, ay] = edge(0);

  const ring = Math.max(10, short * 0.025);
  const dot = Math.max(8, short * 0.018);

  const rings = (marks ?? [])
    .map(
      (mark) =>
        `<circle cx="${round(mark.x * width)}" cy="${round(mark.y * height)}" r="${round(ring)}" fill="${hexColor(mark.color)}" stroke="#ffffff" stroke-width="${round(ring * 0.18)}"/>` +
        numeral(
          Math.trunc(Number(mark.n)) || 0,
          mark.x * width,
          mark.y * height,
          ring * 0.9,
        ),
    )
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<polygon points="${round(cx)},${round(cy)} ${round(lx)},${round(ly)} ${round(rx)},${round(ry)}" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-opacity="0.7" stroke-width="${round(dot * 0.25)}"/>` +
    `<line x1="${round(cx)}" y1="${round(cy)}" x2="${round(ax)}" y2="${round(ay)}" stroke="${CAMERA_COLOR}" stroke-width="${round(dot * 0.35)}" stroke-dasharray="${round(dot)} ${round(dot)}"/>` +
    rings +
    `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(dot)}" fill="${CAMERA_COLOR}" stroke="#000000" stroke-width="${round(dot * 0.3)}"/>` +
    `</svg>`
  );
}

export const SCENE_SYSTEM_PROMPT = `You are the cinematographer for a tabletop fantasy role-playing game. Your job is to CREATE ONE NEW PHOTOGRAPH: what a person standing inside the place on a top-down battle map would see with their own eyes, if that place were real.

THIS IS NOT AN IMAGE EDIT
- Every attached image is a reference only. Never edit, retouch, extend, recolour, overlay or reuse any of them, and never return any of them.
- The battle map is a flat floor plan drawn from directly above. Your photograph is never top-down, overhead, isometric or a bird's-eye view, and no part of the flat map appears in it: not its outline, edges, frame, grid, icons or drawn texture.
- First rebuild the place from the plan as a real three-dimensional room or landscape, then photograph it from the camera.

THE CAMERA
- The plan arrives framed on a square reference board; only the plan inside the frame matters, never the board, its frame or its square shape.
- The camera stands where the yellow dot is on the layout sketch, its lens ${SCENE_EYE_HEIGHT_FT} feet (1.7 m) above the floor, a standing person's eye height, pointing level along the dashed line. Its field of view is the pale wedge, about ${SCENE_FIELD_OF_VIEW} degrees across.
- So the horizon sits near the vertical middle of the frame and the floor recedes towards it. Walls, pillars, doors and furniture rise vertically; the far side of the place faces the camera. The heads of standing people of ordinary height are roughly level with the horizon: nearer people look larger, farther ones smaller.
- Only what lies inside the wedge is visible. Whatever is behind the camera or outside the wedge does not appear.

THE PLACE
- Read the plan for what stands where: floors, walls, doors, windows, pillars, furniture, props, terrain and water. Keep their positions and sizes relative to each other and to the camera.
- Things the plan can only show from above become real objects: a ringed disc on a stand becomes an archery target, a grey square becomes a stone pillar, bright patches along a wall become windows, an orange glow becomes a torch or brazier.
- Objects drawn along the plan's edges stand on the floor against those walls, at their real height. Never hang them high on a wall or stack them in a row along the top of the frame.
- Marks drawn on the plan's floor (sand, dirt, footprints, cracks, stains) stay on the floor. Never copy them onto walls or the ceiling.
- The plan cannot show the ceiling or the upper walls; build them plausibly for the place, from real beams, vaults, stone or sky.
- Take only the mood from the map: its colours, light sources, time of day and atmosphere. Never take its drawing style.
- Scale: one hex of the plan is 5 feet (1.5 m). A Medium humanoid stands roughly 5 to 6.5 feet tall and a Small one 3 to 4 feet, unless a description gives a height. Doors, tables, trees, rocks and every other prop keep believable real-world sizes next to the creatures.

THE CREATURES
- Show exactly the creatures listed, each once, at the listed distance and direction from the camera, and nobody else: no extra people, animals or monsters.
- A reference image shows what a creature looks like. It is often a drawing (anime, cartoon or painted) and often a character sheet with several views, close-ups and text. Use it only to learn the design: face, hair, eyes, ears, skin, build, clothing, armour, colours, weapons and gear. Show the character once, as one real being, never as the sheet's several views.
- Render every creature as real flesh and blood, like an actor in full costume, or a creature built by a film's effects team: real skin with pores, real hair, real fabric, leather and metal, lit by the scene's own light. Elves, orcs and other folk are real actors with prosthetics: a realistic human-proportioned face, never an anime or cartoon face with large eyes and a tiny nose. Never copy a reference's drawing style, line art, flat shading or proportions, and never copy any of its text.
- Every creature has exactly the same photographic realism as the place around it: the same light and shadows, the same lens, focus and film grain, standing on the same floor with real contact shadows. None may look painted, airbrushed, rendered or pasted in, least of all one close to the camera, whose face, skin, hair and costume fill the frame in full photographic detail.
- Keep each creature's distinctive features from its reference, translated into reality: unusual skin such as stone, scales or ash-grey; scars, tattoos and markings; beard, braids and hairstyle; armour, heraldry, shield and weapons.
- Follow any height or build in a description. Anything named as held is in their hands. Follow what each one is said to be doing. A dead creature lies on the ground, a prone one lies down, an invisible one is not shown. A creature partly hidden by another or by the edge of the frame stays where it is.

STYLE
- Photorealistic: a still from a live-action fantasy film, shot on location on a full-frame cinema camera with a 24 to 28 mm lens. Real materials with photographic detail: weathered stone, grained and scuffed wood, real sand, dust in the light. Natural and practical light (windows, torches, fire), believable shadows, gentle depth of field and film grain.
- The attached images are drawings, and the photograph must not look drawn. Never an illustration, digital painting, concept art, anime, cartoon, cel shading, smooth plastic 3D render or video-game art. The same style in every scene.
- No text, letters, numbers, labels, captions, interface, grid lines, hexes, rings, markers, tokens, dice, frames, borders or watermarks. Do not show the camera.
- One landscape ${SCENE_ASPECT} photograph.`;

const ACROSS = ["left", "centre", "right"];
const DOWN = ["top", "middle", "bottom"];

const HEADINGS = [
  "the top edge",
  "the top-right corner",
  "the right edge",
  "the bottom-right corner",
  "the bottom edge",
  "the bottom-left corner",
  "the left edge",
  "the top-left corner",
];

function third(value) {
  return Math.min(2, Math.floor(value * 3));
}

/** Where on the plan the camera stands, in words a model reads reliably. */
export function placeWords({ x, y }) {
  const across = ACROSS[third(x)];
  const down = DOWN[third(y)];

  if (down === "middle") {
    return across === "centre"
      ? "the middle of the map"
      : `the middle of the map's ${across} side`;
  }

  return across === "centre"
    ? `the ${down} middle of the map`
    : `the ${down}-${across} part of the map`;
}

export function headingWords(facing) {
  return `${HEADINGS[Math.round(normaliseFacing(facing) / 45) % 8]} of the map`;
}

function feet(value) {
  return `${Math.max(1, Math.round(value))} ft`;
}

function bearingWords(degrees) {
  if (Math.abs(degrees) <= AHEAD_DEGREES) {
    return "straight ahead";
  }

  return `${Math.round(Math.abs(degrees))}° to the ${degrees < 0 ? "left" : "right"}`;
}

/** Where across the photograph a bearing lands, as a rectilinear lens puts it. */
export function frameWords(degrees) {
  const half = Math.tan((SCENE_FIELD_OF_VIEW / 2) * (Math.PI / 180));
  const across = 0.5 + Math.tan((degrees * Math.PI) / 180) / (2 * half);

  if (across < 0.2) {
    return "at the far left of the photograph";
  }

  if (across < 0.4) {
    return "in the left part of the photograph";
  }

  if (across <= 0.6) {
    return "in the middle of the photograph";
  }

  return across <= 0.8
    ? "in the right part of the photograph"
    : "at the far right of the photograph";
}

function sentence(value, limit) {
  const text = readProse(value).replace(/\s+/g, " ");
  const characters = Array.from(text);

  return characters.length > limit
    ? `${characters.slice(0, limit - 1).join("")}…`
    : text;
}

function conditionWords(keys) {
  return (keys ?? [])
    .filter((key) => Object.hasOwn(CONDITIONS, key))
    .map((key) => CONDITIONS[key].name);
}

/**
 * Ordered parts, each image right after the text naming it. Image parts carry a
 * `source` for the caller to fetch. Hidden pieces are left out: the scene may
 * be shown to the party they are hidden from.
 *
 * `pieces`: `{ id, kind: "character" | "creature", name, x, y, ringColor, race,
 * path, size, description, holding, direction, isHidden, isDead, conditions,
 * imageUrl, templateId }`.
 */
export function composeSceneRequest({
  camera,
  natural,
  gridSize,
  mapName,
  pieces,
}) {
  const seen = (pieces ?? [])
    .filter((piece) => !piece.isHidden)
    .filter((piece) => !(piece.conditions ?? []).includes("invisible"))
    .map((piece) => ({
      ...piece,
      sight: sightOf({ camera, natural, gridSize, point: piece }),
    }))
    .filter((piece) => piece.sight.inView)
    .sort((one, two) => one.sight.distanceFt - two.sight.distanceFt)
    .map((piece, index) => ({ ...piece, n: index + 1 }));

  const marks = seen.map((piece) => ({
    n: piece.n,
    x: piece.x,
    y: piece.y,
    color: piece.kind === "character" ? CAMERA_COLOR : piece.ringColor,
  }));

  // The scene before the pictures, so they read as references to it rather
  // than as the image to work on.
  const lines = [
    `Create a new eye-level photograph of a moment inside the place drawn on the battle map${
      mapName ? ` "${sentence(mapName, 60)}"` : ""
    }.`,
    `The camera stands in ${placeWords(camera)}, at the yellow dot of the layout sketch, ${SCENE_EYE_HEIGHT_FT} ft above the ground, and looks level towards ${headingWords(camera.facing)}, along the dashed line.`,
  ];

  if (camera.note) {
    lines.push(`The moment: ${sentence(camera.note, MAX_SCENE_NOTE_LENGTH)}`);
  }

  if (seen.length === 0) {
    lines.push("Nobody stands in view: show the place alone, empty.");
  } else {
    lines.push("In view, nearest first:");

    for (const piece of seen) {
      lines.push(describePiece(piece));
    }
  }

  const parts = [
    { kind: "text", text: lines.join("\n") },
    {
      kind: "text",
      text: "Reference only, the layout sketch: a square reference board holding the framed top-down plan of the place, marked with the camera and a numbered ring per creature. It is a diagram to read, not a picture to edit.",
    },
    { kind: "image", source: "sketch" },
  ];

  // Party first, nearest first; one picture per invented piece however many stand.
  const references = [];
  const dealt = new Map();

  for (const piece of seen) {
    if (!piece.imageUrl) {
      continue;
    }

    if (piece.kind === "character") {
      references.push({
        url: piece.imageUrl,
        label: `#${piece.n} ${sentence(piece.name, 60)}`,
      });
      continue;
    }

    const key = piece.templateId ?? piece.imageUrl;
    const standing = dealt.get(key);

    if (standing) {
      standing.numbers.push(piece.n);
    } else {
      dealt.set(key, {
        url: piece.imageUrl,
        name: sentence(piece.name, 60),
        numbers: [piece.n],
      });
    }
  }

  for (const creature of dealt.values()) {
    references.push({
      url: creature.url,
      label: `every ${creature.name} (${creature.numbers.map((n) => `#${n}`).join(", ")})`,
    });
  }

  let images = 1;

  for (const reference of references) {
    if (images >= MAX_SCENE_IMAGES) {
      break;
    }

    parts.push({
      kind: "text",
      text: `Reference only, the design of ${reference.label}. Render as a real being, not in this picture's style:`,
    });
    parts.push({ kind: "image", source: "reference", url: reference.url });
    images += 1;
  }

  parts.push({
    kind: "text",
    text: "Now create the new photograph from the camera. It must look like a real photo taken inside the place at eye level: not the top-down map, not a drawing, and not any of the attached images.",
  });

  return { parts, marks, painted: seen };
}

function describePiece(piece) {
  const said = [];
  const kind =
    piece.kind === "character"
      ? [
          "party member",
          [piece.race, piece.path].filter(Boolean).join(" "),
          piece.size,
        ]
      : ["creature"];

  said.push(
    `#${piece.n} ${sentence(piece.name, 60)} (${kind.filter(Boolean).join(", ")}): ${feet(piece.sight.distanceFt)} away, ${bearingWords(piece.sight.bearingDeg)}, so ${frameWords(piece.sight.bearingDeg)}.`,
  );

  if (piece.description) {
    said.push(`Looks: ${sentence(piece.description, 300)}.`);
  }

  if (piece.holding?.name) {
    const what = piece.holding.description
      ? `${sentence(piece.holding.name, 60)} (${sentence(piece.holding.description, 160)})`
      : sentence(piece.holding.name, 60);

    said.push(`Holding: ${what}.`);
  }

  if (piece.direction) {
    said.push(`Doing: ${sentence(piece.direction, MAX_DIRECTION_LENGTH)}.`);
  }

  if (piece.isDead) {
    said.push("Dead, lying on the ground.");
  }

  const conditions = conditionWords(piece.conditions);

  if (conditions.length > 0) {
    said.push(`Conditions: ${conditions.join(", ")}.`);
  }

  return `- ${said.join(" ")}`;
}

/** SSRF guard: the server fetches only public objects in this project's own
    buckets, since a row's URL is one hand-built request away from anywhere. */
export function isOwnStorageImage(url, supabaseUrl) {
  if (typeof url !== "string" || typeof supabaseUrl !== "string") {
    return false;
  }

  let target;
  let home;

  try {
    target = new URL(url);
    home = new URL(supabaseUrl);
  } catch {
    return false;
  }

  if (target.origin !== home.origin || url.includes("..")) {
    return false;
  }

  return REFERENCE_BUCKETS.some((bucket) =>
    target.pathname.startsWith(`/storage/v1/object/public/${bucket}/`),
  );
}

/** The first segment is the owner's uid; the bucket's policy checks it. */
export function sceneObjectPath({ userId, campaignId, sceneId }) {
  return `${userId}/${campaignId}-scene-${sceneId}.webp`;
}

export function scenePathFromUrl(url) {
  return pathFromPublicUrl(url, SCENE_BUCKET);
}

export function sceneName(mapName) {
  return `${sentence(mapName || "Scene", 48)} · scene`;
}

/**
 * The same public object, served as an attachment under a readable file name.
 * Storage's own `download` parameter, because a browser ignores `<a download>`
 * on another origin and opens the picture instead.
 */
export function sceneDownloadUrl(url, name) {
  const target = new URL(url);
  const stem =
    String(name ?? "")
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_-]+/g, "-")
      .toLowerCase() || "scene";

  target.searchParams.set("download", `${stem}.webp`);

  return target.href;
}

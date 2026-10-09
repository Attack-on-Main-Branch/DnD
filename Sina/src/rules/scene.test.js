import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  composeSceneRequest,
  facingTowards,
  feetPerPixel,
  frameWords,
  isOwnStorageImage,
  layoutSketchSvg,
  MAX_SCENE_IMAGES,
  headingWords,
  normaliseFacing,
  placeWords,
  readSceneCamera,
  sceneObjectPath,
  sceneDownloadUrl,
  scenePathFromUrl,
  sightOf,
  validateDirection,
  validateSceneCamera,
} from "./scene.js";

const NATURAL = { width: 1000, height: 1000 };
const GRID = 50;
const HEX = Math.sqrt(3) * GRID;
const SUPABASE = "https://abc.supabase.co";

/** A camera in the middle of the map, looking up the picture. */
const CAMERA = { x: 0.5, y: 0.5, facing: 0, note: null };

function cellsAway(dx, dy) {
  return { x: 0.5 + (dx * HEX) / 1000, y: 0.5 + (dy * HEX) / 1000 };
}

describe("normaliseFacing", () => {
  it("turns any angle into [0, 360)", () => {
    assert.equal(normaliseFacing(-90), 270);
    assert.equal(normaliseFacing(450), 90);
    assert.equal(normaliseFacing(359.97), 0);
    assert.equal(normaliseFacing("nonsense"), 0);
  });
});

describe("readSceneCamera", () => {
  it("reads a row", () => {
    assert.deepEqual(
      readSceneCamera({
        map_id: "m",
        world_x: 0.25,
        world_y: 0.75,
        facing: 400,
        note: "  dusk ",
      }),
      { mapId: "m", x: 0.25, y: 0.75, facing: 40, note: "dusk" },
    );
  });

  it("refuses a point off the picture", () => {
    assert.equal(
      readSceneCamera({ map_id: "m", world_x: 1.2, world_y: 0 }),
      null,
    );
    assert.equal(
      readSceneCamera({ map_id: "m", world_x: null, world_y: 0 }),
      null,
    );
  });
});

describe("validateSceneCamera", () => {
  it("bounds the point and the moment", () => {
    assert.ok(validateSceneCamera({ x: 2, y: 0 }).errors.point);
    assert.ok(
      validateSceneCamera({ x: 0, y: 0, note: "x".repeat(301) }).errors.note,
    );
  });

  it("answers values for a good camera", () => {
    assert.deepEqual(
      validateSceneCamera({ x: 0.1, y: 0.2, facing: -10, note: "" }).values,
      { x: 0.1, y: 0.2, facing: 350, note: null },
    );
  });
});

describe("validateDirection", () => {
  it("trims, and refuses one too long", () => {
    assert.equal(validateDirection("  waiting  ").value, "waiting");
    assert.ok(validateDirection("x".repeat(201)).error);
  });
});

describe("feetPerPixel", () => {
  it("makes one hex step five feet", () => {
    assert.ok(Math.abs(feetPerPixel(GRID) * HEX - 5) < 1e-9);
  });
});

describe("sightOf", () => {
  it("sees a piece straight ahead, and says how far", () => {
    const sight = sightOf({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      point: cellsAway(0, -2),
    });

    assert.equal(sight.inView, true);
    assert.ok(Math.abs(sight.distanceFt - 10) < 1e-6);
    assert.ok(Math.abs(sight.bearingDeg) < 1e-6);
  });

  it("puts a piece up and to the left on the left", () => {
    const sight = sightOf({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      point: cellsAway(-1, -2),
    });

    assert.equal(sight.inView, true);
    assert.ok(sight.bearingDeg < 0);
  });

  it("does not see behind itself", () => {
    const sight = sightOf({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      point: cellsAway(0, 3),
    });

    assert.equal(sight.inView, false);
  });

  it("does not see off to the side", () => {
    const sight = sightOf({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      point: cellsAway(3, 0),
    });

    assert.equal(sight.inView, false);
  });

  it("turns with the camera", () => {
    const sight = sightOf({
      camera: { ...CAMERA, facing: 90 },
      natural: NATURAL,
      gridSize: GRID,
      point: cellsAway(3, 0),
    });

    assert.equal(sight.inView, true);
  });
});

describe("facingTowards", () => {
  it("aims at the middle of the pieces", () => {
    assert.equal(
      facingTowards(CAMERA, [cellsAway(2, -1), cellsAway(2, 1)], NATURAL),
      90,
    );
  });

  it("looks up the picture on an empty board", () => {
    assert.equal(facingTowards(CAMERA, [], NATURAL), 0);
  });
});

describe("layoutSketchSvg", () => {
  it("draws digits as lines and never as text", () => {
    const svg = layoutSketchSvg({
      width: 800,
      height: 600,
      camera: CAMERA,
      marks: [{ n: 12, x: 0.5, y: 0.2, color: "#3b82f6" }],
    });

    assert.match(svg, /^<svg /);
    assert.doesNotMatch(svg, /<text/);
    assert.match(svg, /fill="#3b82f6"/);
  });

  it("never prints a colour it was not given in hex", () => {
    const svg = layoutSketchSvg({
      width: 100,
      height: 100,
      camera: CAMERA,
      marks: [{ n: 1, x: 0.5, y: 0.2, color: '"/><script>' }],
    });

    assert.doesNotMatch(svg, /script/);
  });
});

function piece(overrides) {
  return {
    id: "t",
    kind: "creature",
    name: "Goblin",
    ringColor: "#ef4444",
    isHidden: false,
    isDead: false,
    conditions: [],
    imageUrl: `${SUPABASE}/storage/v1/object/public/campaign-maps/u/goblin.webp`,
    templateId: "goblin",
    ...cellsAway(0, -2),
    ...overrides,
  };
}

describe("placeWords and headingWords", () => {
  it("names where on the plan the camera stands", () => {
    assert.equal(
      placeWords({ x: 0.5, y: 0.9 }),
      "the bottom middle of the map",
    );
    assert.equal(
      placeWords({ x: 0.1, y: 0.1 }),
      "the top-left part of the map",
    );
    assert.equal(
      placeWords({ x: 1, y: 0.5 }),
      "the middle of the map's right side",
    );
    assert.equal(placeWords({ x: 0.5, y: 0.5 }), "the middle of the map");
  });

  it("names which way it looks, to the nearest eighth", () => {
    assert.equal(headingWords(0), "the top edge of the map");
    assert.equal(headingWords(350), "the top edge of the map");
    assert.equal(headingWords(130), "the bottom-right corner of the map");
    assert.equal(headingWords(270), "the left edge of the map");
  });
});

describe("frameWords", () => {
  it("places a bearing across the photograph", () => {
    assert.equal(frameWords(0), "in the middle of the photograph");
    assert.equal(frameWords(-20), "in the left part of the photograph");
    assert.equal(frameWords(-34), "at the far left of the photograph");
    assert.equal(frameWords(20), "in the right part of the photograph");
    assert.equal(frameWords(38), "at the far right of the photograph");
  });
});

describe("composeSceneRequest", () => {
  it("describes the scene first, marks every picture as a reference, and ends by asking for a new photograph", () => {
    const { parts } = composeSceneRequest({
      camera: { ...CAMERA, y: 0.9 },
      natural: NATURAL,
      gridSize: GRID,
      mapName: "Training hall",
      pieces: [],
    });

    assert.equal(parts[0].kind, "text");
    assert.match(parts[0].text, /stands in the bottom middle of the map/);
    assert.match(parts[0].text, /looks level towards the top edge of the map/);

    parts.forEach((part, at) => {
      if (part.kind === "image") {
        assert.match(parts[at - 1].text, /^Reference only/);
      }
    });

    assert.match(parts.at(-1).text, /^Now create the new photograph/);
  });

  it("sends the marked-up plan as the only picture of the place", () => {
    const { parts } = composeSceneRequest({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      mapName: "Crypt",
      pieces: [],
    });

    const images = parts.filter((part) => part.kind === "image");

    assert.deepEqual(
      images.map((part) => part.source),
      ["sketch"],
    );
  });

  it("numbers what is in view, nearest first, and leaves out the rest", () => {
    const { painted, marks } = composeSceneRequest({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      pieces: [
        piece({ id: "far", ...cellsAway(0, -4) }),
        piece({ id: "near", ...cellsAway(0, -1) }),
        piece({ id: "behind", ...cellsAway(0, 2) }),
        piece({ id: "hidden", isHidden: true }),
        piece({ id: "unseen", conditions: ["invisible"] }),
      ],
    });

    assert.deepEqual(
      painted.map((one) => one.id),
      ["near", "far"],
    );
    assert.deepEqual(
      marks.map((mark) => mark.n),
      [1, 2],
    );
  });

  it("sends one picture per invented piece, and the party before it", () => {
    const { parts } = composeSceneRequest({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      pieces: [
        piece({ id: "g1", ...cellsAway(0, -1) }),
        piece({ id: "g2", ...cellsAway(0.3, -2) }),
        piece({
          id: "hero",
          kind: "character",
          name: "Arwen",
          race: "Elf",
          path: "Ranger",
          size: "Medium",
          templateId: null,
          imageUrl: `${SUPABASE}/storage/v1/object/public/campaign-maps/u/arwen.webp`,
          holding: { name: "Longbow", description: "Yew" },
          direction: "drawing an arrow",
          ...cellsAway(0, -3),
        }),
      ],
    });

    const references = parts.filter((part) => part.source === "reference");

    assert.equal(references.length, 2);
    assert.match(references[0].url, /arwen/);

    const text = parts
      .filter((part) => part.kind === "text")
      .map((part) => part.text)
      .join("\n");

    assert.match(text, /Holding: Longbow \(Yew\)/);
    assert.match(text, /Doing: drawing an arrow/);
    assert.match(text, /every Goblin \(#1, #2\)/);
  });

  it(`never sends more than ${MAX_SCENE_IMAGES} pictures`, () => {
    const pieces = Array.from({ length: 20 }, (_, at) =>
      piece({
        id: `c${at}`,
        kind: "character",
        name: `Hero ${at}`,
        templateId: null,
        imageUrl: `${SUPABASE}/storage/v1/object/public/campaign-maps/u/${at}.webp`,
        ...cellsAway(0, -1 - at * 0.1),
      }),
    );

    const { parts } = composeSceneRequest({
      camera: CAMERA,
      natural: NATURAL,
      gridSize: GRID,
      pieces,
    });

    assert.equal(
      parts.filter((part) => part.kind === "image").length,
      MAX_SCENE_IMAGES,
    );
  });
});

describe("isOwnStorageImage", () => {
  it("allows this project's public buckets", () => {
    assert.equal(
      isOwnStorageImage(
        `${SUPABASE}/storage/v1/object/public/character-avatars/u/a.webp`,
        SUPABASE,
      ),
      true,
    );
  });

  it("refuses another host, another bucket and a climb", () => {
    assert.equal(
      isOwnStorageImage(
        "https://evil.example/storage/v1/object/public/campaign-maps/a.webp",
        SUPABASE,
      ),
      false,
    );
    assert.equal(
      isOwnStorageImage(
        `${SUPABASE}/storage/v1/object/public/campaign-fog-masks/a.webp`,
        SUPABASE,
      ),
      false,
    );
    assert.equal(
      isOwnStorageImage(
        `${SUPABASE}/storage/v1/object/public/campaign-maps/../../auth/v1/user`,
        SUPABASE,
      ),
      false,
    );
    assert.equal(isOwnStorageImage("http://169.254.169.254/", SUPABASE), false);
  });
});

describe("scene paths", () => {
  it("puts the owner's uid first and round-trips the URL", () => {
    const path = sceneObjectPath({
      userId: "u",
      campaignId: "c",
      sceneId: "s",
    });

    assert.equal(path, "u/c-scene-s.webp");
    assert.equal(
      scenePathFromUrl(
        `${SUPABASE}/storage/v1/object/public/campaign-maps/${path}`,
      ),
      path,
    );
  });
});

describe("sceneDownloadUrl", () => {
  const URL_OF = `${SUPABASE}/storage/v1/object/public/campaign-maps/u/c-scene-s.webp`;

  it("asks Storage for an attachment named after the scene", () => {
    assert.equal(
      sceneDownloadUrl(URL_OF, "Goblin Cave · scene"),
      `${URL_OF}?download=goblin-cave-scene.webp`,
    );
  });

  it("keeps accented letters readable and falls back on an empty name", () => {
    assert.equal(
      new URL(sceneDownloadUrl(URL_OF, "Château d’Ombre")).searchParams.get(
        "download",
      ),
      "chateau-dombre.webp",
    );
    assert.equal(
      new URL(sceneDownloadUrl(URL_OF, " · ")).searchParams.get("download"),
      "scene.webp",
    );
  });
});

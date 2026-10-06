"use client";

import { useState } from "react";
import {
  MAX_DIRECTION_LENGTH,
  MAX_SCENE_NOTE_LENGTH,
  sightOf,
} from "sina/rules/scene";

import Avatar from "@/app/components/ui/avatar";
import Button from "@/app/components/ui/button";
import {
  controlClasses,
  LABEL_CLASSES,
} from "@/app/components/ui/field-styles";
import { FADED_RULE_CLASSES } from "@/app/components/ui/surface";

import { useSceneStaging } from "./scene-staging";
import {
  useAllConditions,
  useAllDead,
  useAllPacks,
  usePlacedTokens,
  useTokenTemplates,
} from "./table-state";
import { useTableMaps } from "./table-maps";
import { piecesOnMap } from "./use-map-tokens";

const TURN_STEP = 15;

export default function SceneDrawer({ faces, onArm }) {
  const { activeId, isWorldMap, isScene, natural, grid } = useTableMaps();
  const scene = useSceneStaging();

  const placed = usePlacedTokens();
  const templates = useTokenTemplates();
  const dead = useAllDead();
  const conditions = useAllConditions();
  const packs = useAllPacks();

  const [drafts, setDrafts] = useState({});
  const [noteDraft, setNoteDraft] = useState(null);

  if (!activeId || isWorldMap || isScene) {
    return (
      <p className="px-5 py-6 text-center text-sm text-ink/50 italic">
        Put a battle map on the table to stage a scene on it.
      </p>
    );
  }

  const camera = scene.cameras.get(activeId) ?? null;

  const pieces = piecesOnMap({
    placed,
    mapId: activeId,
    isWorldMap,
    faces,
    templates,
    dead,
    conditions,
  });

  function turn(by) {
    scene.commitCamera(activeId, { facing: (camera.facing + by + 360) % 360 });
  }

  // Out of the way of the board the next click lands on.
  function arm() {
    scene.arm(true);
    onArm?.();
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className={LABEL_CLASSES}>Camera</h3>

        {scene.armed ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gold">Click the map to set it down.</p>
            <Button variant="ghost" onClick={() => scene.arm(false)}>
              Cancel
            </Button>
          </div>
        ) : camera ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto font-mono text-xs text-ink/60">
              Facing {Math.round(camera.facing)}°
            </p>
            <Button
              variant="secondary"
              onClick={() => turn(-TURN_STEP)}
              aria-label={`Turn the camera ${TURN_STEP} degrees left`}
            >
              ↺
            </Button>
            <Button
              variant="secondary"
              onClick={() => turn(TURN_STEP)}
              aria-label={`Turn the camera ${TURN_STEP} degrees right`}
            >
              ↻
            </Button>
            <Button variant="secondary" onClick={arm}>
              Move
            </Button>
            <Button variant="ghost" onClick={() => scene.takeCamera(activeId)}>
              Remove
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={arm}>
            Place camera
          </Button>
        )}

        <p className="text-xs text-ink/50">
          Only you can see it. Drag it to move it, and drag the ring at the end
          of its view to aim it.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <label htmlFor="scene-moment" className={LABEL_CLASSES}>
          The moment
        </label>
        <textarea
          id="scene-moment"
          rows={2}
          maxLength={MAX_SCENE_NOTE_LENGTH}
          disabled={!camera}
          value={noteDraft ?? camera?.note ?? ""}
          onChange={(event) => setNoteDraft(event.target.value)}
          onBlur={() => {
            if (noteDraft !== null && camera) {
              scene.commitCamera(activeId, { note: noteDraft.trim() || null });
            }

            setNoteDraft(null);
          }}
          placeholder="Dusk, rain on the stones, torches guttering…"
          className={controlClasses({ className: "resize-none" })}
        />
      </section>

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      <section className="flex flex-col gap-3">
        <h3 className={LABEL_CLASSES}>On the board</h3>

        {pieces.length === 0 ? (
          <p className="text-sm text-ink/50 italic">
            Nothing is standing on this map. The scene will be the place alone.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pieces.map((piece) => {
              const sight = camera
                ? sightOf({
                    camera,
                    natural,
                    gridSize: grid.size,
                    point: piece,
                  })
                : null;
              const held = piece.characterId
                ? (packs[piece.characterId] ?? []).find((row) => row.in_hand)
                : null;
              const inputId = `scene-direction-${piece.id}`;

              return (
                <li key={piece.id} className="flex gap-3">
                  <PieceFace piece={piece} />

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label
                        htmlFor={inputId}
                        className="truncate font-display text-sm font-semibold tracking-wide text-ink"
                      >
                        {piece.label}
                      </label>
                      <Sighting piece={piece} sight={sight} />
                    </div>

                    {held && (
                      <p className="truncate text-xs text-ink/55">
                        Holding {held.name}
                      </p>
                    )}

                    <input
                      id={inputId}
                      type="text"
                      maxLength={MAX_DIRECTION_LENGTH}
                      value={
                        drafts[piece.id] ?? scene.directions.get(piece.id) ?? ""
                      }
                      onChange={(event) =>
                        setDrafts((all) => ({
                          ...all,
                          [piece.id]: event.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (drafts[piece.id] !== undefined) {
                          scene.direct(piece.id, drafts[piece.id]);
                        }

                        setDrafts(({ [piece.id]: _, ...rest }) => rest);
                      }}
                      placeholder="What are they doing?"
                      className={controlClasses({ className: "py-1.5" })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div aria-hidden="true" className={FADED_RULE_CLASSES} />

      <section className="flex flex-col gap-2">
        <Button
          fullWidth
          disabled={!camera || scene.painting}
          onClick={() => scene.paint(activeId)}
        >
          {scene.painting ? "Painting…" : "Paint the scene"}
        </Button>

        {scene.painting ? (
          <p className="text-xs text-ink/50" aria-live="polite">
            This can take up to a minute. You can close this tray meanwhile.
          </p>
        ) : !camera ? (
          <p className="text-xs text-ink/50">Place the camera first.</p>
        ) : null}

        {scene.problem && !scene.painting && (
          <p role="alert" className="text-xs text-red-300">
            {scene.problem}
          </p>
        )}
      </section>
    </div>
  );
}

function PieceFace({ piece }) {
  if (piece.characterId) {
    return (
      <Avatar src={piece.src} color={piece.color} size="sm" ring={false} />
    );
  }

  return (
    <span
      style={{ borderColor: piece.ringColor }}
      className="box-border grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-surface"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={piece.src}
        alt=""
        draggable={false}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}

function Sighting({ piece, sight }) {
  const [words, lit] = piece.isHidden
    ? ["Hidden · left out", false]
    : piece.conditions.includes("invisible")
      ? ["Invisible · left out", false]
      : sight?.distanceFt == null
        ? [null, false]
        : sight.inView
          ? [`In view · ${Math.max(1, Math.round(sight.distanceFt))} ft`, true]
          : ["Out of view", false];

  if (!words) {
    return null;
  }

  return (
    <span
      className={`shrink-0 font-mono text-[10px] tracking-[0.12em] uppercase ${
        lit ? "text-gold" : "text-ink/40"
      }`}
    >
      {words}
    </span>
  );
}

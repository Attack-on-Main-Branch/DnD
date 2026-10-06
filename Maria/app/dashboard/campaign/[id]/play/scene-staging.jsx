"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { facingTowards, readSceneCamera } from "sina/rules/scene";

import { useToast } from "@/app/components/ui/toast";

import {
  directToken,
  paintScene,
  removeCamera,
  stageCamera,
} from "./scene-actions";
import { useTableMaps } from "./table-maps";

/**
 * The Dungeon Master's camera and directions, held in the browser. NEVER told
 * to the table's channel: every chair hears that, and the camera is a secret.
 * A player's chair gets the resting value and draws nothing.
 */

const RESTING = {
  enabled: false,
  cameras: new Map(),
  directions: new Map(),
  armed: false,
  arm: () => {},
  place: () => {},
  paintCamera: () => {},
  commitCamera: () => {},
  takeCamera: () => {},
  direct: () => {},
  painting: false,
  problem: null,
  paint: () => {},
};

const SceneContext = createContext(RESTING);

export function useSceneStaging() {
  return useContext(SceneContext);
}

function readCameras(rows) {
  const cameras = new Map();

  for (const row of rows ?? []) {
    const camera = readSceneCamera(row);

    if (camera) {
      cameras.set(camera.mapId, camera);
    }
  }

  return cameras;
}

function readDirections(rows) {
  return new Map(
    (rows ?? [])
      .filter((row) => typeof row?.token_id === "string")
      .map((row) => [row.token_id, String(row.direction ?? "")]),
  );
}

export default function SceneStaging({ campaignId, seed, children }) {
  if (!seed) {
    return children;
  }

  return (
    <Staging campaignId={campaignId} seed={seed}>
      {children}
    </Staging>
  );
}

function Staging({ campaignId, seed, children }) {
  const { show } = useToast();
  const { natural, resync } = useTableMaps();

  const [cameras, setCameras] = useState(() => readCameras(seed.cameras));
  const [directions, setDirections] = useState(() =>
    readDirections(seed.directions),
  );
  const [armed, setArmed] = useState(false);
  const [painting, setPainting] = useState(false);
  const [problem, setProblem] = useState(null);

  /** What the database last agreed to, to fall back on after a refusal. */
  const kept = useRef(cameras);

  const paintCamera = useCallback((mapId, patch) => {
    setCameras((standing) => {
      const camera = standing.get(mapId);

      if (!camera) {
        return standing;
      }

      const next = new Map(standing);

      next.set(mapId, { ...camera, ...patch });
      return next;
    });
  }, []);

  const write = useCallback(
    (camera) => {
      stageCamera(camera.mapId, camera).then(
        (answer) => {
          if (answer?.kind === "rejected") {
            show(answer.message);
            setCameras(kept.current);
            return;
          }

          kept.current = new Map(kept.current).set(camera.mapId, answer.camera);
        },
        () => {
          show("That did not reach the table. Try again.");
          setCameras(kept.current);
        },
      );
    },
    [show],
  );

  const place = useCallback(
    (mapId, point, towards) => {
      setArmed(false);

      const standing = cameras.get(mapId);
      const camera = {
        mapId,
        x: point.x,
        y: point.y,
        facing:
          standing?.facing ??
          facingTowards(
            point,
            towards ?? [],
            natural ?? { width: 1, height: 1 },
          ),
        note: standing?.note ?? null,
      };

      setCameras((all) => new Map(all).set(mapId, camera));
      write(camera);
    },
    [cameras, natural, write],
  );

  /** Writes the camera as it now stands; `patch` lands first if given. */
  const commitCamera = useCallback(
    (mapId, patch = null) => {
      const camera = cameras.get(mapId);

      if (!camera) {
        return;
      }

      const next = patch ? { ...camera, ...patch } : camera;

      if (patch) {
        setCameras((all) => new Map(all).set(mapId, next));
      }

      write(next);
    },
    [cameras, write],
  );

  const takeCamera = useCallback(
    (mapId) => {
      setCameras((all) => {
        const next = new Map(all);

        next.delete(mapId);
        return next;
      });

      removeCamera(mapId).then(
        (answer) => {
          if (answer?.kind === "rejected") {
            show(answer.message);
            setCameras(kept.current);
            return;
          }

          const next = new Map(kept.current);

          next.delete(mapId);
          kept.current = next;
        },
        () => {
          show("That did not reach the table. Try again.");
          setCameras(kept.current);
        },
      );
    },
    [show],
  );

  const direct = useCallback(
    (tokenId, text) => {
      const before = directions.get(tokenId) ?? "";
      const asked = text.trim();

      if (asked === before) {
        return;
      }

      setDirections((all) => {
        const next = new Map(all);

        if (asked) {
          next.set(tokenId, asked);
        } else {
          next.delete(tokenId);
        }

        return next;
      });

      directToken(tokenId, asked).then(
        (answer) => {
          if (answer?.kind === "rejected") {
            show(answer.message);
            setDirections((all) => new Map(all).set(tokenId, before));
          }
        },
        () => {
          show("That did not reach the table. Try again.");
          setDirections((all) => new Map(all).set(tokenId, before));
        },
      );
    },
    [directions, show],
  );

  const paint = useCallback(
    async (mapId) => {
      if (painting) {
        return;
      }

      setPainting(true);
      setProblem(null);

      try {
        const answer = await paintScene(campaignId, mapId);

        if (answer?.kind === "rejected") {
          setProblem(answer.message);
          show(answer.message);
          return;
        }

        resync();
        show("You'll find it on the shelf under Maps.", {
          tone: "done",
          title: "Scene painted",
        });
      } catch {
        const message = "That did not reach the table. Try again.";

        setProblem(message);
        show(message);
      } finally {
        setPainting(false);
      }
    },
    [campaignId, painting, resync, show],
  );

  const value = useMemo(
    () => ({
      enabled: true,
      cameras,
      directions,
      armed,
      arm: setArmed,
      place,
      paintCamera,
      commitCamera,
      takeCamera,
      direct,
      painting,
      problem,
      paint,
    }),
    [
      armed,
      cameras,
      commitCamera,
      direct,
      directions,
      paint,
      paintCamera,
      painting,
      place,
      problem,
      takeCamera,
    ],
  );

  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
}

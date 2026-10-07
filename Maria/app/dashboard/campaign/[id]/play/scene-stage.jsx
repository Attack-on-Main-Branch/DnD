"use client";

import { MAX_SCENES } from "sina/rules/scene";

import SceneMark from "@/app/components/ui/scene-mark";

import DmTray from "./dm-tray";
import SceneDrawer from "./scene-drawer";
import { useTableMaps } from "./table-maps";

/**
 * The scene painter, in the head of the table's box. It stays open while the
 * camera is armed: the panel stands beside the board now, not over it, so it
 * is in nobody's way and shows that the next click places the camera.
 */
export default function SceneStage({ faces }) {
  const { maps } = useTableMaps();
  const painted = maps.filter((map) => map.is_scene).length;

  return (
    <DmTray
      mark={<SceneMark className="size-11" />}
      markLabel={`Scene painter, ${painted} of ${MAX_SCENES} scenes`}
      title="Scene"
      meta={`${painted} / ${MAX_SCENES}`}
      panelLabel="Stage and paint a scene"
    >
      <div className="px-5 pt-4 pb-5">
        <SceneDrawer faces={faces} />
      </div>
    </DmTray>
  );
}

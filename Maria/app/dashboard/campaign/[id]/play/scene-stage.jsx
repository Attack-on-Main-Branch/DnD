"use client";

import { MAX_SCENES } from "sina/rules/scene";

import SceneMark from "@/app/components/ui/scene-mark";

import { useRailMarks } from "./rail-marks";
import RailTray from "./rail-tray";
import SceneDrawer from "./scene-drawer";
import { POPOVER_BODY_CLASSES } from "./table-popover";
import { useTableMaps } from "./table-maps";

/** The scene painter, on the Dungeon Master's rail beside the board. */
export default function SceneStage({ faces }) {
  const { maps } = useTableMaps();
  const { close } = useRailMarks();
  const painted = maps.filter((map) => map.is_scene).length;

  return (
    <RailTray
      mark={<SceneMark className="size-11" />}
      markLabel={`Scene painter, ${painted} of ${MAX_SCENES} scenes`}
      title="Scene"
      meta={`${painted} / ${MAX_SCENES}`}
      dialogLabel="Stage and paint a scene"
    >
      <div
        className={`scroll-gold overflow-y-auto px-5 pt-4 pb-5 ${POPOVER_BODY_CLASSES}`}
      >
        <SceneDrawer faces={faces} onArm={close} />
      </div>
    </RailTray>
  );
}

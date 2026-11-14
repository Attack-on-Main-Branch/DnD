"use client";

import { useState } from "react";

const PACK_DRAG_TYPE = "application/x-grimoire-pack-row";

export function usePackDrag(rows) {
  const [draggedId, setDraggedId] = useState(null);
  const [dropOn, setDropOn] = useState(null);
  const dragged = draggedId && rows.find((row) => row.id === draggedId);

  function clearDrag() {
    setDraggedId(null);
    setDropOn(null);
  }

  function dragProps(row) {
    return {
      draggable: true,
      onDragStart(event) {
        event.dataTransfer.setData(PACK_DRAG_TYPE, row.id);
        event.dataTransfer.effectAllowed = "move";
        setDraggedId(row.id);
      },
      onDragEnd: clearDrag,
    };
  }

  function dropZone(place, accepts, land) {
    const taking = Boolean(dragged && accepts(dragged));

    return {
      taking,
      over: taking && dropOn === place,
      props: {
        onDragOver(event) {
          if (!taking) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropOn(place);
        },
        onDragLeave(event) {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setDropOn((current) => (current === place ? null : current));
          }
        },
        onDrop(event) {
          if (
            !taking ||
            event.dataTransfer.getData(PACK_DRAG_TYPE) !== dragged.id
          )
            return;
          event.preventDefault();
          clearDrag();
          land(dragged);
        },
      },
    };
  }

  return { dragProps, dropZone, clearDrag };
}

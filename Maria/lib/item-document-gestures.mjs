export const ITEM_DOCUMENT_POINTER = "grimoire:item-pointer";
export const ITEM_DOCUMENT_GESTURES = "grimoire:item-gestures";

export function itemDocumentGestureScript() {
  return `(${relayPointers.toString()})(${JSON.stringify(ITEM_DOCUMENT_POINTER)}, ${JSON.stringify(ITEM_DOCUMENT_GESTURES)});`;
}

function relayPointers(channel, settings) {
  const pointers = new Map();
  let enabled = false;
  let moved = false;

  window.addEventListener("message", (event) => {
    if (event.source !== parent || event.data?.type !== settings) return;
    enabled = event.data.enabled === true;
    document.documentElement.toggleAttribute("data-item-gestures", enabled);
    if (!enabled) pointers.clear();
  });

  function relay(event) {
    if (!enabled) return;
    const { pointerId, pointerType, screenX, screenY, clientX, clientY, type } =
      event;
    if (type === "pointerdown") {
      if (event.button !== 0) return;
      if (!pointers.size) moved = false;
      pointers.set(pointerId, { screenX, screenY });
      if (pointers.size > 1) moved = true;
      if (pointerType === "mouse") {
        try {
          event.target.setPointerCapture?.(pointerId);
        } catch {}
      }
    } else {
      const start = pointers.get(pointerId);
      if (!start) return;
      if (Math.hypot(screenX - start.screenX, screenY - start.screenY) > 4)
        moved = true;
      if (type !== "pointermove") pointers.delete(pointerId);
    }
    parent.postMessage(
      {
        channel,
        type,
        pointerId,
        pointerType,
        screenX,
        screenY,
        clientX,
        clientY,
        isPrimary: event.isPrimary,
      },
      "*",
    );
  }

  for (const type of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ]) {
    window.addEventListener(type, relay, true);
  }
  window.addEventListener(
    "wheel",
    (event) => {
      if (!enabled) return;
      event.preventDefault();
      const { clientX, clientY, deltaY } = event;
      parent.postMessage(
        { channel, type: "wheel", clientX, clientY, deltaY },
        "*",
      );
    },
    { capture: true, passive: false },
  );
  window.addEventListener(
    "dragstart",
    (event) => {
      if (enabled) event.preventDefault();
    },
    true,
  );
  window.addEventListener(
    "click",
    (event) => {
      if (enabled && moved && event.detail > 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

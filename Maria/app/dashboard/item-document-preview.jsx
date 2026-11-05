"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import Button from "@/app/components/ui/button";
import FormAlert from "@/app/components/ui/form-alert";
import {
  ITEM_DOCUMENT_SANDBOX,
  ITEM_DOCUMENT_VIEWPORT,
} from "@/lib/item-document.mjs";
import {
  ITEM_DOCUMENT_GESTURES,
  ITEM_DOCUMENT_POINTER,
} from "@/lib/item-document-gestures.mjs";

import { useMapZoom } from "./campaign/[id]/use-map-zoom";

const POINTER_HANDLERS = new Map([
  ["pointerdown", "onPointerDown"],
  ["pointermove", "onPointerMove"],
  ["pointerup", "onPointerUp"],
  ["pointercancel", "onPointerCancel"],
  ["lostpointercapture", "onPointerCancel"],
]);
const { width, height } = ITEM_DOCUMENT_VIEWPORT;

export default function ItemDocumentPreview({
  name,
  source,
  loading,
  error,
  onRetry,
}) {
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[var(--preview-width)] overflow-hidden rounded-xl bg-surface ring-1 ring-gold/20 max-sm:min-h-0 max-sm:max-w-none max-sm:flex-1 max-sm:aspect-auto">
      {loading && (
        <div className="absolute inset-0 grid place-items-center p-4">
          <p role="status" className="text-center text-sm text-ink/55">
            Opening item…
          </p>
        </div>
      )}
      {error && (
        <div className="scroll-gold absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto p-4">
          <FormAlert>{error}</FormAlert>
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
      {source && <DocumentFrame name={name} source={source} />}
    </div>
  );
}

function DocumentFrame({ name, source }) {
  const frameRef = useRef(null);
  const iframeRef = useRef(null);
  const relay = useRef({ ids: new Set(), x: 0, y: 0 });
  const { frameProps, imageStyle, zoomAt } = useMapZoom({
    frameRef,
    contentSize: ITEM_DOCUMENT_VIEWPORT,
    pinch: true,
    wheel: true,
    keyboard: false,
    pointerZoom: false,
  });

  useEffect(() => {
    const frame = frameRef.current;
    const resize = () => {
      const fitWidth = Math.min(
        frame.clientWidth,
        (frame.clientHeight * width) / height,
      );
      frame.style.setProperty("--item-document-fit", String(fitWidth / width));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  function enableGestures() {
    iframeRef.current?.contentWindow?.postMessage(
      { type: ITEM_DOCUMENT_GESTURES, enabled: true },
      "*",
    );
  }

  const receive = useEffectEvent((event) => {
    const iframe = iframeRef.current;
    const frame = frameRef.current;
    const message = event.data;
    // The opaque sandbox may affect only this preview's local pan and zoom.
    if (
      event.origin !== "null" ||
      event.source !== iframe?.contentWindow ||
      message?.channel !== ITEM_DOCUMENT_POINTER ||
      !frame
    )
      return;

    if (message.type === "wheel") {
      const { clientX, clientY, deltaY } = message;
      if (![clientX, clientY, deltaY].every(Number.isFinite)) return;
      const box = iframe.getBoundingClientRect();
      zoomAt(
        box.left + (clientX * box.width) / width,
        box.top + (clientY * box.height) / height,
        deltaY,
      );
      return;
    }

    const {
      type,
      pointerId,
      pointerType,
      screenX,
      screenY,
      clientX,
      clientY,
      isPrimary,
    } = message;
    const handler = POINTER_HANDLERS.get(type);
    if (
      !handler ||
      !Number.isSafeInteger(pointerId) ||
      ![screenX, screenY, clientX, clientY].every(Number.isFinite) ||
      !["mouse", "touch", "pen"].includes(pointerType)
    )
      return;

    const standing = relay.current;
    if (type === "pointerdown") {
      if (standing.ids.has(pointerId) || standing.ids.size >= 4) return;
      if (!standing.ids.size) {
        const box = iframe.getBoundingClientRect();
        standing.x = box.left + (clientX * box.width) / width - screenX;
        standing.y = box.top + (clientY * box.height) / height - screenY;
      }
      standing.ids.add(pointerId);
    } else {
      if (!standing.ids.has(pointerId)) return;
      if (type !== "pointermove") standing.ids.delete(pointerId);
    }

    frameProps[handler]({
      button: 0,
      pointerId,
      pointerType,
      isPrimary: isPrimary === true,
      clientX: standing.x + screenX,
      clientY: standing.y + screenY,
      currentTarget: {
        getBoundingClientRect: () => frame.getBoundingClientRect(),
      },
      target: frame,
    });
  });

  useEffect(() => {
    const ids = relay.current.ids;
    const listener = (event) => receive(event);
    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
      ids.clear();
    };
  }, []);

  return (
    <div ref={frameRef} {...frameProps} className="absolute inset-0 touch-none">
      <div
        className="absolute top-1/2 left-1/2 -translate-1/2"
        style={{
          width: `calc(${width}px * var(--item-document-fit, 0))`,
          height: `calc(${height}px * var(--item-document-fit, 0))`,
          ...imageStyle,
        }}
      >
        <iframe
          ref={iframeRef}
          title={name}
          srcDoc={source}
          sandbox={ITEM_DOCUMENT_SANDBOX}
          referrerPolicy="no-referrer"
          width={width}
          height={height}
          onLoad={enableGestures}
          style={{
            width,
            height,
            transform: "scale(var(--item-document-fit, 0))",
          }}
          className="absolute top-0 left-0 origin-top-left border-0"
        />
      </div>
    </div>
  );
}

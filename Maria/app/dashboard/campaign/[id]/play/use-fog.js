"use client";

import { useCallback, useEffect, useRef } from "react";
import { FOG_MASK_WIDTH } from "sina/rules/fog";

/**
 * One offscreen canvas per board, holding where the light has been painted.
 * Opaque is revealed, transparent is dark — so an empty canvas is a map nobody
 * has opened, which is what a map with no mask row is.
 *
 * NOT REACT STATE. A stroke is thirty stamps a second, so the pixels live in a
 * ref and anything drawing from them subscribes; nothing here sets state at all.
 * It lives in the provider because the ribbon that paints and the board it
 * paints are in different subtrees.
 *
 * CROSS-ORIGIN IS LOAD-BEARING: a canvas that has had an image without CORS
 * drawn into it is TAINTED, and `toBlob` then throws instead of returning the
 * stroke just painted. `crossOrigin` before `src` is the only order that counts.
 */

/** How much of the brush's edge is feathered rather than hard. */
const FEATHER = 0.35;

/** How far apart two stamps may fall before the gap between them shows. */
const STAMP_STEP = 0.34;

export function useFogMask({ mapId, maskUrl, natural, own = null }) {
  const maskRef = useRef(null);
  const listeners = useRef(new Set());

  const announce = useCallback(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, []);

  const subscribe = useCallback((listener) => {
    listeners.current.add(listener);

    return () => listeners.current.delete(listener);
  }, []);

  /** Made on first use, remade when the picture's ratio changes. The ratio has
      to be the map's, or a circle painted here is an ellipse over there. */
  const ensure = useCallback((size) => {
    if (!size?.width || !size?.height) {
      return null;
    }

    const width = FOG_MASK_WIDTH;
    const height = Math.max(
      1,
      Math.round((FOG_MASK_WIDTH * size.height) / size.width),
    );

    const standing = maskRef.current;

    if (standing?.width === width && standing?.height === height) {
      return standing;
    }

    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    maskRef.current = canvas;

    return canvas;
  }, []);

  /**
   * What the database says has been revealed. Keyed on the URL, which is what
   * the stamp is for: the object is upserted in place, so only the stamp says a
   * new mask has landed.
   *
   * A map with no mask is CLEARED — switching to an unopened map must not leave
   * the last one's light on it.
   */
  useEffect(() => {
    const canvas = ensure(natural);

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    /* The painter does not fetch back their own stroke: those pixels are
       already on this canvas, and the object is served with no cache. */
    if (own?.current && own.current === maskUrl) {
      return undefined;
    }

    if (!maskUrl) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      announce();

      return undefined;
    }

    let live = true;
    const image = new Image();

    // Before `src`, which is the only order in which it counts. See above.
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (!live || maskRef.current !== canvas) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      announce();
    };

    /* A mask that will not load leaves the darkness that is already there — the
       one thing it must never do is throw the board open. */
    image.onerror = () => {};
    image.src = maskUrl;

    return () => {
      live = false;
    };
    // `own` is a ref and deliberately not a dependency: it is read at the
    // moment a URL arrives, and changing what this browser last painted is not
    // a reason to go and load anything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announce, ensure, mapId, maskUrl, natural]);

  /**
   * One stroke, both points in fractions of the picture. Reveal paints and hide
   * erases, so the two are one operation with the compositing swapped.
   *
   * The gradient is the soft edge; the loop fills the gap between two reported
   * points, which a fast hand would otherwise leave dotted.
   */
  const stroke = useCallback(
    (from, to, mode, brush) => {
      const canvas = maskRef.current;

      if (!canvas || !to) {
        return;
      }

      const context = canvas.getContext("2d");
      const radius = Math.max(2, (brush / 100) * canvas.width);

      context.save();
      context.globalCompositeOperation =
        mode === "hide" ? "destination-out" : "source-over";

      const start = from ?? to;
      const across = (to.x - start.x) * canvas.width;
      const down = (to.y - start.y) * canvas.height;
      const span = Math.hypot(across, down);
      const stamps = Math.max(1, Math.ceil(span / (radius * STAMP_STEP)));

      for (let step = 0; step <= stamps; step += 1) {
        const at = step / stamps;
        const x = start.x * canvas.width + across * at;
        const y = start.y * canvas.height + down * at;

        const light = context.createRadialGradient(
          x,
          y,
          radius * (1 - FEATHER),
          x,
          y,
          radius,
        );

        light.addColorStop(0, "rgba(255,255,255,1)");
        light.addColorStop(1, "rgba(255,255,255,0)");

        context.fillStyle = light;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      announce();
    },
    [announce],
  );

  /** WebP if the browser will write one: `toBlob` falls back to PNG and says so
      in the blob's type, which is what names the object. */
  const serialise = useCallback(
    () =>
      new Promise((resolve) => {
        const canvas = maskRef.current;

        if (!canvas) {
          resolve(null);
          return;
        }

        try {
          canvas.toBlob((blob) => resolve(blob), "image/webp", 0.85);
        } catch {
          // A tainted canvas, which `crossOrigin` above is what prevents.
          resolve(null);
        }
      }),
    [],
  );

  return { maskRef, subscribe, stroke, serialise };
}

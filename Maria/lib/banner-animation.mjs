const FRAME_MS = 1000 / 30;
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 800;

export function bannerResolution(canvas, maxPixelRatio = 1.5) {
  const { width, height } =
    canvas.clientWidth === undefined
      ? canvas.getBoundingClientRect()
      : { width: canvas.clientWidth, height: canvas.clientHeight };
  const scale = Math.min(
    window.devicePixelRatio || 1,
    maxPixelRatio,
    MAX_WIDTH / width,
    MAX_HEIGHT / height,
  );
  return {
    width,
    height,
    scale,
    pixelsWide: Math.max(1, Math.round(width * scale)),
    pixelsHigh: Math.max(1, Math.round(height * scale)),
  };
}

export function createBannerClock(paint, maxDelta = 0.1) {
  let frame = null;
  let last = null;
  let playing = false;
  let destroyed = false;
  let pending = false;

  function schedule() {
    if (playing && !destroyed && !pending && frame === null)
      frame = requestAnimationFrame(tick);
  }

  function finish() {
    pending = false;
    schedule();
  }

  function tick(now) {
    frame = null;
    if (!playing || destroyed) return;
    if (last === null || now - last >= FRAME_MS - 0.5) {
      const delta = last === null ? 0 : Math.min((now - last) / 1000, maxDelta);
      last = now;
      const result = paint(delta);
      if (result?.then) {
        pending = true;
        result.then(finish, () => {
          playing = false;
          finish();
        });
      }
    }
    schedule();
  }

  function stopFrame() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last = null;
  }

  return {
    setPlaying(next) {
      if (destroyed || playing === next) return;
      playing = next;
      stopFrame();
      schedule();
    },
    destroy() {
      destroyed = true;
      playing = false;
      stopFrame();
    },
  };
}

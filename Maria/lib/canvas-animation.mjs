import { bannerResolution, createBannerClock } from "./banner-animation.mjs";

export function createCanvasAnimation(
  canvas,
  { paint, resize = () => {}, dispose = () => {}, maxDelta = 0.1 },
) {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const state = { context, width: 0, height: 0, scale: 1, time: 0 };
  let playing = false;
  let destroyed = false;
  const clock = createBannerClock((delta) => {
    state.time += delta;
    paint(state, delta);
  }, maxDelta);

  function schedule() {
    clock.setPlaying(Boolean(playing && state.width && state.height));
  }

  function updateSize() {
    if (destroyed) return;
    const { width, height, scale, pixelsWide, pixelsHigh } =
      bannerResolution(canvas);
    if (!width || !height) {
      state.width = width;
      state.height = height;
      schedule();
      return;
    }
    if (
      width === state.width &&
      height === state.height &&
      scale === state.scale
    ) {
      schedule();
      return;
    }
    Object.assign(state, { width, height, scale });
    canvas.width = pixelsWide;
    canvas.height = pixelsHigh;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    resize(state);
    paint(state, 0);
    schedule();
  }

  const observer = new ResizeObserver(updateSize);
  observer.observe(canvas);
  updateSize();

  return {
    setPlaying(next) {
      if (destroyed || playing === next) return;
      playing = next;
      schedule();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      playing = false;
      clock.destroy();
      observer.disconnect();
      dispose();
      canvas.width = canvas.height = 0;
    },
  };
}

const banners = new Map();
let observer = null;
let preference = null;

function setPlaying(surface, playing) {
  const banner = banners.get(surface);
  if (banner.playing === playing) return;
  banner.playing = playing;
  const state = playing ? "running" : "paused";
  surface.style.setProperty("--banner-play-state", state);
  surface.style.setProperty(
    "--banner-will-change",
    playing ? "transform" : "auto",
  );
  banner.onPlaying?.(playing);
}

function refresh() {
  for (const [surface, { visible }] of banners) {
    setPlaying(surface, visible && !document.hidden && !preference.matches);
  }
}

export function observeBannerMotion(surface, onPlaying) {
  if (!observer) {
    preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!banners.has(entry.target)) continue;
          const visible =
            entry.isIntersecting && entry.intersectionRatio >= 0.01;
          banners.get(entry.target).visible = visible;
          setPlaying(
            entry.target,
            visible && !document.hidden && !preference.matches,
          );
        }
      },
      { threshold: 0.01 },
    );
    document.addEventListener("visibilitychange", refresh);
    preference.addEventListener("change", refresh);
  }

  banners.set(surface, { visible: false, playing: null, onPlaying });
  setPlaying(surface, false);
  observer.observe(surface);
  let subscribed = true;

  return () => {
    if (!subscribed) return;
    subscribed = false;
    observer.unobserve(surface);
    setPlaying(surface, false);
    banners.delete(surface);
    if (banners.size) return;
    observer.disconnect();
    document.removeEventListener("visibilitychange", refresh);
    preference.removeEventListener("change", refresh);
    observer = null;
    preference = null;
  };
}

export function observeBannerRenderer(canvas, loadRenderer) {
  let renderer = null;
  let createRenderer = null;
  let loading = false;
  let disposed = false;
  let playing = false;
  let initialized = false;

  function refreshRenderer() {
    if (disposed) return;
    if (renderer) {
      renderer.setPlaying(playing);
      return;
    }
    if (!playing || initialized) return;
    if (createRenderer) {
      initialized = true;
      renderer = createRenderer(canvas);
      renderer?.setPlaying(true);
    } else if (!loading) {
      loading = true;
      loadRenderer()
        .then((create) => {
          createRenderer = create;
          refreshRenderer();
        })
        .catch(() => {})
        .finally(() => {
          loading = false;
        });
    }
  }

  const unobserve = observeBannerMotion(canvas, (next) => {
    playing = next;
    refreshRenderer();
  });

  return () => {
    disposed = true;
    unobserve();
    renderer?.destroy();
  };
}

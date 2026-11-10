import { bannerResolution, createBannerClock } from "./banner-animation.mjs";
import { createContourWorker } from "./contour-worker-client.mjs";

const VERTEX = `
precision highp float;
in vec3 position;
out vec2 uv;
void main() {
  uv = position.xy * .5 + .5;
  gl_Position = vec4(position, 1.);
}`;

const FRAGMENT = `
precision highp float;
in vec2 uv;
out vec4 outputColor;
uniform vec2 resolution;
uniform float time;
uniform float strokeWidth;
const float TERRAIN_PHASE = 2.37;

float hash(vec3 point) {
  point = fract(point * vec3(.1031, .1030, .0973));
  point += dot(point, point.yxz + 33.33);
  return fract((point.x + point.y) * point.z);
}

float noise(vec3 point) {
  vec3 cell = floor(point);
  vec3 blend = fract(point);
  blend = blend * blend * blend * (blend * (blend * 6. - 15.) + 10.);
  return mix(
    mix(mix(hash(cell), hash(cell + vec3(1., 0., 0.)), blend.x),
        mix(hash(cell + vec3(0., 1., 0.)), hash(cell + vec3(1., 1., 0.)), blend.x), blend.y),
    mix(mix(hash(cell + vec3(0., 0., 1.)), hash(cell + vec3(1., 0., 1.)), blend.x),
        mix(hash(cell + vec3(0., 1., 1.)), hash(cell + vec3(1., 1., 1.)), blend.x), blend.y),
    blend.z);
}

float terrainElevation(vec2 point, float evolution) {
  return (noise(vec3(point, evolution))
    + .28 * noise(vec3(point * 1.9 + 13., evolution * .8 + 11.))) * 7.;
}

void main() {
  vec2 fieldScale = vec2(6.8, 6.8 * resolution.y / resolution.x);
  vec2 point = (uv - .5) * fieldScale;
  point += vec2(6.4, 3.2);
  float flowTime = time * .05 + TERRAIN_PHASE;
  vec2 warp = vec2(
    noise(vec3(point * .65 + 21., flowTime * .7)),
    noise(vec3(point * .65 + 51., flowTime * .7 + 7.))
  ) - .5;
  point += warp * .85;
  float elevation = terrainElevation(point, flowTime);
  float distanceToLine = abs(fract(elevation + .5) - .5);
  float edge = max(fwidth(elevation), .0001);
  float pixels = distanceToLine / edge;
  float line = 1. - smoothstep(max(0., strokeWidth * .5 - .5), strokeWidth * .5 + .5, pixels);
  outputColor = vec4(vec3(line), 1.);
}`;

const FILTER = `
precision highp float;
in vec2 uv;
out vec4 outputColor;
uniform sampler2D contours;
uniform vec3 ink;
void main() {
  float line = texture(contours, uv).r;
  outputColor = vec4(ink * line, line);
}`;

export function createTopography(THREE, canvas) {
  let renderer;
  let cleaner;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    cleaner = createContourWorker();
  } catch {
    renderer?.dispose();
    return null;
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const theme = getComputedStyle(canvas);
  const uniforms = {
    resolution: { value: new THREE.Vector2(1, 1) },
    time: { value: 0 },
    strokeWidth: { value: 1 },
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
  );
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const filterUniforms = {
    contours: { value: null },
    ink: { value: new THREE.Color(theme.color).convertLinearToSRGB() },
  };
  const filterMaterial = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX,
    fragmentShader: FILTER,
    uniforms: filterUniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const filtered = new THREE.Scene();
  const filterMesh = new THREE.Mesh(geometry, filterMaterial);
  filterMesh.frustumCulled = false;
  filtered.add(filterMesh);
  const camera = new THREE.Camera();
  let playing = false;
  let destroyed = false;
  let lost = false;
  let sized = false;
  let reading = false;
  let generation = 0;
  let pixels = null;
  let texture = null;
  let minimumExtent = 4;
  let ready = false;
  let size = null;
  const clock = createBannerClock((delta) => {
    uniforms.time.value += delta;
    return paint();
  });

  function schedule() {
    clock.setPlaying(playing && sized && !lost);
  }

  function showStill() {
    if (!ready) return;
    ready = false;
    canvas.removeAttribute("data-topography-ready");
  }

  async function paint() {
    if (!sized || lost || destroyed || reading) return;
    reading = true;
    const version = generation;
    const framePixels = pixels;
    const { width, height } = target;
    try {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      await renderer.readRenderTargetPixelsAsync(
        target,
        0,
        0,
        width,
        height,
        framePixels,
      );
      if (destroyed || lost || version !== generation) return;
      const cleaned = await cleaner.clean(
        framePixels,
        width,
        height,
        minimumExtent,
      );
      if (destroyed || lost || version !== generation) return;
      pixels = cleaned;
      texture.image.data = cleaned;
      texture.needsUpdate = true;
      renderer.render(filtered, camera);
      if (!ready) {
        ready = true;
        canvas.setAttribute("data-topography-ready", "");
      }
    } catch {
      if (!destroyed && version === generation) {
        lost = true;
        schedule();
        showStill();
      }
    } finally {
      reading = false;
      if (!destroyed && !lost && version !== generation) paint();
    }
  }

  function resize() {
    if (destroyed || lost) return;
    const next = bannerResolution(canvas, 1);
    const { width, height, scale, pixelsWide, pixelsHigh } = next;
    if (!width || !height) {
      sized = false;
      schedule();
      return;
    }
    if (
      sized &&
      width === size.width &&
      height === size.height &&
      scale === size.scale
    )
      return;
    size = next;
    showStill();
    renderer.setSize(pixelsWide, pixelsHigh, false);
    target.setSize(pixelsWide, pixelsHigh);
    generation++;
    pixels = new Uint8Array(pixelsWide * pixelsHigh * 4);
    texture?.dispose();
    texture = new THREE.DataTexture(pixels, pixelsWide, pixelsHigh);
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
    filterUniforms.contours.value = texture;
    uniforms.resolution.value.set(pixelsWide, pixelsHigh);
    uniforms.strokeWidth.value = Math.max(0.9, width / 250) * scale;
    minimumExtent = 4 * scale;
    sized = true;
    paint();
    schedule();
  }

  function contextLost(event) {
    event.preventDefault();
    lost = true;
    sized = false;
    generation++;
    schedule();
    showStill();
  }

  function contextRestored() {
    if (destroyed) return;
    lost = false;
    resize();
  }

  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

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
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      showStill();
      geometry.dispose();
      material.dispose();
      filterMaterial.dispose();
      target.dispose();
      texture?.dispose();
      pixels = null;
      cleaner.dispose();
      renderer.dispose();
      canvas.width = canvas.height = 0;
    },
  };
}

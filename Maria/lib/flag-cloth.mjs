import { bannerResolution, createBannerClock } from "./banner-animation.mjs";

const CLOTH = `
uniform float time;
uniform float aspect;
const float CLOTH_MARGIN = 1.26;
const float WAVE_STRENGTH = .6;

float reach(vec2 point) {
  return pow(clamp(1. - point.y, 0., 1.), .7);
}

float elevation(vec2 point) {
  vec2 wind = vec2(.14, .065);
  vec2 flow = point - wind * time;
  vec2 warp = .035 * vec2(
    sin(dot(flow, vec2(4.3, 7.1)) + time * .3),
    sin(dot(flow, vec2(6.7, -3.9)) - time * .24)
  );
  vec2 field = point + warp;
  float packet = .5 + .5 * sin(dot(flow, vec2(5.1, 6.7)) + time * .37);
  float detail = .55 + .45 * sin(dot(flow, vec2(9.3, -4.7)) - time * .29);
  float billow = sin(dot(field - wind * time * .78, vec2(12.3, 5.1)));
  float ripple = sin(dot(field - wind * time * 1.04, vec2(25.7, -8.3)) + .8);
  float flutter = sin(dot(field - wind * time * 1.23, vec2(38.9, 14.7)) + 2.3);
  float crease = sin(dot(field - wind * time * .91, vec2(56.3, -18.1)) + 4.7);
  float gust = .9 + .1 * sin(time * .7);
  return (.054 * billow + .05 * (.4 + .6 * packet) * ripple
    + .028 * detail * flutter + .014 * (1. - .55 * packet) * crease)
    * gust * WAVE_STRENGTH;
}

vec3 drape(vec2 point) {
  float freedom = reach(point);
  float height = elevation(point);
  vec3 cloth = vec3((point - .5) * vec2(aspect, 1.) * CLOTH_MARGIN, 0.);
  cloth.x += .12 * aspect * height;
  cloth.y += .16 * height - .018 * freedom * freedom;
  cloth.z = height;
  return cloth;
}`;

const VERTEX = `
precision highp float;
in vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
out vec2 weave;
out float clothLight;
${CLOTH}

float foldShadow(vec2 point, vec3 light) {
  float height = elevation(point);
  vec2 stepUV = light.xy / (vec2(aspect, 1.) * CLOTH_MARGIN);
  float occlusion = 0.;
  for (int step = 0; step < 8; step++) {
    float distance = .0125 + float(step) * .0125;
    vec2 sampleUV = point + stepUV * distance;
    if (any(lessThan(sampleUV, vec2(0.))) || any(greaterThan(sampleUV, vec2(1.)))) break;
    float rayHeight = height + light.z * distance;
    float separation = elevation(sampleUV) - rayHeight - .004;
    float softness = .008 + distance * .04;
    occlusion = max(occlusion, smoothstep(-softness, softness, separation));
  }
  return 1. - occlusion * .24;
}

void main() {
  vec3 cloth = drape(uv);
  vec3 tangent = drape(uv + vec2(.001, 0.)) - cloth;
  vec3 bitangent = drape(uv + vec2(0., .001)) - cloth;
  vec3 normal = normalize(normalMatrix * cross(tangent, bitangent));
  vec3 light = normalize(vec3(-.85, .3, .55));
  float diffuse = max(dot(normal, light), 0.);
  clothLight = diffuse > 0. ? diffuse * foldShadow(uv, light) : 0.;
  weave = (uv - .5) * CLOTH_MARGIN + .5;
  vec4 viewPosition = modelViewMatrix * vec4(cloth, 1.);
  gl_Position = projectionMatrix * viewPosition;
}`;

const FRAGMENT = `
precision highp float;
in vec2 weave;
in float clothLight;
out vec4 outputColor;
uniform sampler2D cloth;
uniform vec3 sunlight;
#include <colorspace_pars_fragment>

void main() {
  vec3 lighting = vec3(.38) + sunlight * (1.5 * clothLight);
  vec3 fabric = texture(cloth, weave).rgb;
  outputColor = sRGBTransferOETF(vec4(fabric * lighting, 1.));
}`;

export function createFlagCloth(THREE, canvas, source) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }

  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const uniforms = {
    cloth: { value: null },
    time: { value: 0 },
    aspect: { value: 1 },
    sunlight: { value: new THREE.Color(getComputedStyle(canvas).color) },
  };
  const geometry = new THREE.PlaneGeometry(1, 1, 96, 64);
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
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 10);
  camera.position.z = 0.5 / Math.tan(Math.PI / 12);
  let playing = false;
  let destroyed = false;
  let lost = false;
  let sized = false;
  let loaded = false;
  let ready = false;
  let size = null;
  const clock = createBannerClock((delta) => {
    uniforms.time.value += delta;
    paint();
  });

  function schedule() {
    clock.setPlaying(playing && loaded && sized && !lost);
  }

  function paint() {
    if (!sized || !loaded || lost || destroyed) return;
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      canvas.setAttribute("data-flag-ready", "");
    }
  }

  function resize() {
    if (destroyed || lost) return;
    const next = bannerResolution(canvas);
    const { width, height, pixelsWide, pixelsHigh } = next;
    if (!width || !height) {
      sized = false;
      schedule();
      return;
    }
    if (
      sized &&
      width === size.width &&
      height === size.height &&
      next.scale === size.scale
    )
      return;
    size = next;
    renderer.setSize(pixelsWide, pixelsHigh, false);
    uniforms.aspect.value = width / height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    sized = true;
    paint();
    schedule();
  }

  function contextLost(event) {
    event.preventDefault();
    lost = true;
    ready = sized = false;
    schedule();
    canvas.removeAttribute("data-flag-ready");
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
  const texture = new THREE.TextureLoader().load(source, () => {
    if (destroyed) return;
    loaded = true;
    paint();
    schedule();
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  uniforms.cloth.value = texture;
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
      canvas.removeAttribute("data-flag-ready");
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      canvas.width = canvas.height = 0;
    },
  };
}

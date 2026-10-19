import { createFogTexture, readFogColor } from "./fog-texture";
import { FOG_EDGE_SWAY_PIXELS, isFogClearForDm } from "./fog-paint";

export const FOG_TRANSITION_MS = 650;

function transitionProgress(start, now) {
  if (start === null) return 1;
  const progress = Math.max(0, Math.min(1, (now - start) / FOG_TRANSITION_MS));
  return progress * progress * (3 - 2 * progress);
}

const VERTEX = `#version 300 es
out vec2 uv;
void main() {
  vec2 position = gl_VertexID == 0 ? vec2(-1., -1.) :
                  gl_VertexID == 1 ? vec2(3., -1.) : vec2(-1., 3.);
  uv = vec2((position.x + 1.) * .5, (1. - position.y) * .5);
  gl_Position = vec4(position, 0., 1.);
}`;

const BLUR = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outputColor;
uniform sampler2D source;
uniform vec2 stepSize;
uniform bool firstPass;
vec2 fogAt(vec2 point) {
  vec4 pixel = texture(source, point);
  if (!firstPass) return pixel.rg;
  ivec2 size = textureSize(source, 0);
  ivec2 at = clamp(ivec2(point * vec2(size)), ivec2(0), size - 1);
  vec4 stored = texelFetch(source, at, 0);
  float alpha = stored.r >= .5 ? stored.a : 0.;
  float revealed = pixel.r >= .5 ? pixel.a : 0.;
  return vec2(1. - revealed, alpha > 0. && alpha < 1. ? 1. : 0.);
}
void main() {
  vec2 fog = fogAt(uv) * .227027;
  fog += (fogAt(uv + stepSize) + fogAt(uv - stepSize)) * .1945946;
  fog += (fogAt(uv + stepSize * 2.) + fogAt(uv - stepSize * 2.)) * .1216216;
  fog += (fogAt(uv + stepSize * 3.) + fogAt(uv - stepSize * 3.)) * .054054;
  fog += (fogAt(uv + stepSize * 4.) + fogAt(uv - stepSize * 4.)) * .016216;
  outputColor = vec4(fog, 0., 1.);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 outputColor;
uniform sampler2D mask;
uniform sampler2D softened;
uniform sampler2D clouds;
uniform sampler2D previous;
uniform vec3 ground;
uniform vec3 silver;
uniform float time;
uniform bool dm;
uniform bool coverageOnly;
uniform float progress;
uniform vec2 texel;
float fogAt(vec2 point) {
  vec4 painted = texture(mask, point);
  float clear = step(.5, painted.r) * step(.001, painted.a);
  float original = 1. - painted.a * clear;
  vec2 blur = texture(softened, point).rg;
  // Authored feathers already have a continuous curve; only soften legacy hard edges.
  float legacy = 1. - smoothstep(0., .025, blur.g);
  return original + pow(1. - original, 5.) * smoothstep(0., .5, blur.r) * legacy;
}
void main() {
  vec4 painted = texture(mask, uv);
  float fog = dm ? 1. - step(.5, painted.r) * step(.001, painted.a) : fogAt(uv);
  vec2 drift = vec2(time * .012, time * .005);
  float bank = texture(clouds, uv * 1.35 + drift).a;
  vec2 curl = vec2(bank - .5, texture(clouds, uv.yx * 1.7 - drift).a - .5);
  float billow = texture(clouds, uv * 2.7 - drift * .8 + curl * .22).a;
  float wisp = texture(clouds, uv * vec2(5.5, 3.5) + drift * 1.4 + curl * .35).a;
  float density = smoothstep(.12, .85, bank * .52 + billow * .33 + wisp * .15);
  if (!dm) {
    vec2 sway = vec2(sin(uv.y * 31. + time * .85 + bank * 6.),
                     cos(uv.x * 27. - time * .65 + billow * 5.));
    vec2 offset = sway * texel * ${FOG_EDGE_SWAY_PIXELS.toFixed(1)} * (time > 0. ? 1. : 0.);
    float shifted = fogAt(uv + offset);
    fog = mix(fog, shifted, 1. - fog);
    fog = mix(texture(previous, vec2(uv.x, 1. - uv.y)).r, fog, progress);
  }
  vec3 color = mix(ground, silver, .06 + density * .68);
  outputColor = coverageOnly ? vec4(vec3(fog), 1.) : vec4(color * fog, fog);
}`;

function program(gl, fragment) {
  const shaders = [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, fragment],
  ].map(([type, source]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error("Fog shader unavailable");
    }
    return shader;
  });
  const linked = gl.createProgram();
  for (const shader of shaders) gl.attachShader(linked, shader);
  gl.linkProgram(linked);
  for (const shader of shaders) gl.deleteShader(shader);
  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
    gl.deleteProgram(linked);
    throw new Error("Fog shader unavailable");
  }
  return linked;
}

function gpuRenderer(canvas, palette, noise, dm) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
  });
  if (!gl) return null;
  const fog = program(gl, FRAGMENT);
  const blur = program(gl, BLUR);
  const textures = Array.from({ length: 6 }, (_, unit) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      unit === 3 ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      unit === 3 ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    return texture;
  });
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, textures[3]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noise);
  const frames = [1, 2, 4, 5].map((unit) => {
    const frame = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textures[unit],
      0,
    );
    return frame;
  });
  gl.useProgram(fog);
  const location = (name) => gl.getUniformLocation(fog, name);
  gl.uniform1i(location("mask"), 0);
  gl.uniform1i(location("softened"), 2);
  gl.uniform1i(location("clouds"), 3);
  gl.uniform1i(location("dm"), dm ? 1 : 0);
  gl.uniform3fv(
    location("ground"),
    palette.ground.map((value) => value / 255),
  );
  gl.uniform3fv(
    location("silver"),
    palette.silver.map((value) => value / 255),
  );
  const clock = location("time");
  const blend = location("progress");
  const previous = location("previous");
  const coverageOnly = location("coverageOnly");
  const texel = location("texel");
  const source = gl.getUniformLocation(blur, "source");
  const direction = gl.getUniformLocation(blur, "stepSize");
  const first = gl.getUniformLocation(blur, "firstPass");
  let width = 0;
  let height = 0;
  let softWidth = 0;
  let softHeight = 0;
  let history = 0;
  let started = null;

  function draw(time, now, frame = null) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    gl.viewport(0, 0, width, height);
    gl.useProgram(fog);
    gl.uniform1f(clock, time);
    const progress = transitionProgress(started, now);
    gl.uniform1f(blend, progress);
    gl.uniform1i(previous, 4 + history);
    gl.uniform1i(coverageOnly, frame ? 1 : 0);
    gl.uniform2f(texel, 1 / width, 1 / height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return progress < 1;
  }

  return {
    kind: "gpu",
    update(mask, change = {}, now = performance.now()) {
      const resized = width !== mask.width || height !== mask.height;
      if (width && !resized && !dm && !change.immediate) {
        draw(now / 1000, now, frames[2 + (1 - history)]);
        history = 1 - history;
        started = now;
      } else started = null;
      if (resized) {
        width = canvas.width = mask.width;
        height = canvas.height = mask.height;
        softWidth = Math.max(1, Math.ceil(width / 4));
        softHeight = Math.max(1, Math.ceil(height / 4));
        for (const unit of [0, 1, 2, 4, 5]) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            unit === 1 || unit === 2 ? softWidth : width,
            unit === 1 || unit === 2 ? softHeight : height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
          );
        }
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      if (!resized && change.dirty && change.pixels) {
        const { dirty, pixels, sourceX, sourceY } = change;
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, pixels.width);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, sourceX);
        gl.pixelStorei(gl.UNPACK_SKIP_ROWS, sourceY);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          dirty.x,
          dirty.y,
          dirty.width,
          dirty.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels.data,
        );
        gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
        gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
      } else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          mask,
        );
      }
      if (!dm) {
        gl.useProgram(blur);
        gl.viewport(0, 0, softWidth, softHeight);
        for (let pass = 0; pass < 2; pass += 1) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, frames[pass]);
          gl.uniform1i(source, pass);
          gl.uniform1i(first, pass === 0 ? 1 : 0);
          gl.uniform2f(
            direction,
            pass === 0 ? 1 / softWidth : 0,
            pass === 1 ? 1 / softHeight : 0,
          );
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
    },
    draw(time, now = performance.now()) {
      return width ? draw(time, now) : false;
    },
    dispose() {
      for (const frame of frames) gl.deleteFramebuffer(frame);
      for (const texture of textures) gl.deleteTexture(texture);
      gl.deleteProgram(fog);
      gl.deleteProgram(blur);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

function canvasRenderer(canvas, palette, noise, dm) {
  const context = canvas.getContext("2d");
  const silhouette = document.createElement("canvas");
  const alpha = silhouette.getContext("2d");
  const previous = document.createElement("canvas");
  const history = previous.getContext("2d");
  const blended = document.createElement("canvas");
  const coverage = blended.getContext("2d");
  const moving = document.createElement("canvas");
  const edge = moving.getContext("2d");
  const shifted = document.createElement("canvas");
  const rim = shifted.getContext("2d");
  const clouds = context.createPattern(noise, "repeat");
  let started = null;
  let initialized = false;

  function blend(now) {
    const progress = transitionProgress(started, now);
    coverage.clearRect(0, 0, blended.width, blended.height);
    coverage.globalAlpha = 1 - progress;
    coverage.drawImage(previous, 0, 0);
    coverage.globalCompositeOperation = "lighter";
    coverage.globalAlpha = progress;
    coverage.drawImage(silhouette, 0, 0);
    coverage.globalAlpha = 1;
    coverage.globalCompositeOperation = "source-over";
    return progress < 1;
  }

  return {
    kind: "canvas",
    update(mask, change = {}, now = performance.now()) {
      const resized =
        canvas.width !== mask.width || canvas.height !== mask.height;
      if (initialized && !resized && !dm && !change.immediate) {
        blend(now);
        history.clearRect(0, 0, previous.width, previous.height);
        history.drawImage(blended, 0, 0);
        started = now;
      } else started = null;
      if (resized) {
        canvas.width =
          silhouette.width =
          previous.width =
          blended.width =
          moving.width =
          shifted.width =
            mask.width;
        canvas.height =
          silhouette.height =
          previous.height =
          blended.height =
          moving.height =
          shifted.height =
            mask.height;
      }
      const dirty =
        !resized && change.dirty
          ? change.dirty
          : { x: 0, y: 0, width: mask.width, height: mask.height };
      const pixels = mask
        .getContext("2d")
        .getImageData(dirty.x, dirty.y, dirty.width, dirty.height);
      for (let at = 0; at < pixels.data.length; at += 4) {
        pixels.data[at + 3] = dm
          ? isFogClearForDm(pixels.data, at)
            ? 0
            : 255
          : isFogClearForDm(pixels.data, at)
            ? 255 - pixels.data[at + 3]
            : 255;
      }
      alpha.putImageData(pixels, dirty.x, dirty.y);
      initialized = true;
    },
    draw(time, now = performance.now()) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = palette.groundCss;
      context.fillRect(0, 0, canvas.width, canvas.height);
      for (let layer = 0; layer < 2; layer += 1) {
        const span = canvas.width * (layer ? 0.45 : 0.85);
        clouds.setTransform(
          new DOMMatrix()
            .translate(
              time * span * 0.012 * (layer ? -1 : 1),
              time * span * 0.005,
            )
            .scale(span / noise.width),
        );
        context.fillStyle = clouds;
        context.globalAlpha = layer ? 0.45 : 0.8;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.globalAlpha = 1;
      context.globalCompositeOperation = "destination-in";
      const transitioning = started !== null ? blend(now) : false;
      let shape = started === null ? silhouette : blended;
      if (!dm && time > 0) {
        edge.clearRect(0, 0, moving.width, moving.height);
        edge.drawImage(shape, 0, 0);
        edge.globalCompositeOperation = "destination-in";
        edge.drawImage(shape, 0, 0);
        edge.globalCompositeOperation = "source-over";
        rim.clearRect(0, 0, shifted.width, shifted.height);
        rim.drawImage(
          shape,
          Math.sin(time * 0.85) * FOG_EDGE_SWAY_PIXELS,
          Math.cos(time * 0.65) * FOG_EDGE_SWAY_PIXELS,
        );
        rim.globalCompositeOperation = "destination-out";
        rim.drawImage(shape, 0, 0);
        rim.globalCompositeOperation = "source-over";
        edge.globalCompositeOperation = "lighter";
        edge.drawImage(shifted, 0, 0);
        edge.globalCompositeOperation = "source-over";
        shape = moving;
      }
      context.drawImage(shape, 0, 0);
      if (!transitioning) started = null;
      context.globalCompositeOperation = "source-over";
      return transitioning;
    },
    dispose() {},
  };
}

export function createFogRenderer(host, dm) {
  const theme = getComputedStyle(host);
  const groundCss = theme.getPropertyValue("--color-surface").trim();
  const silverCss = theme.getPropertyValue("--color-silver").trim();
  const palette = {
    groundCss,
    ground: Array.from(readFogColor(groundCss)).slice(0, 3),
    silver: Array.from(readFogColor(silverCss)).slice(0, 3),
  };
  const noise = createFogTexture(silverCss);
  let canvas = document.createElement("canvas");
  let renderer;
  let mask = null;
  try {
    renderer = gpuRenderer(canvas, palette, noise, dm);
  } catch {
    canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
    canvas = document.createElement("canvas");
  }
  renderer ??= canvasRenderer(canvas, palette, noise, dm);
  canvas.className = "size-full";
  canvas.dataset.fogRenderer = renderer.kind;
  host.append(canvas);
  function fallback(event) {
    event.preventDefault();
    const previous = renderer;
    const lost = canvas;
    lost.removeEventListener("webglcontextlost", fallback);
    canvas = document.createElement("canvas");
    canvas.className = "size-full";
    host.replaceChildren(canvas);
    renderer = canvasRenderer(canvas, palette, noise, dm);
    canvas.dataset.fogRenderer = renderer.kind;
    if (mask) {
      renderer.update(mask);
      renderer.draw(0);
    }
    previous.dispose();
  }
  canvas.addEventListener("webglcontextlost", fallback);
  return {
    update(next, change, now) {
      mask = next;
      renderer.update(next, change, now);
    },
    draw(time, now) {
      return renderer.draw(time, now);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", fallback);
      canvas.remove();
      renderer.dispose();
    },
  };
}

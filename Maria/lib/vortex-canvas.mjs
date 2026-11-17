import { createCanvasAnimation } from "./canvas-animation.mjs";

const MAX_FLOW_WIDTH = 512;
const MAX_FLOW_HEIGHT = 256;
const FLOW_RATE = 0.65;
const TAU = 2 * Math.PI;

let texturePromise;

function fraction(value) {
  return value - Math.floor(value);
}

const sparks = Array.from({ length: 64 }, (_, index) => ({
  angle: TAU * fraction(index * 0.618034),
  phase: fraction(index * 0.414214),
  reach: 115 + 375 * fraction(index * 0.732051),
  duration: 3 + 4 * fraction(index * 0.236068),
  size: 1.3 + 5.1 * fraction(index * 0.645751) ** 2,
  streak: index % 6 === 0,
}));

async function loadTexture(source) {
  const image = new Image();
  image.src = source;
  await image.decode();

  const { naturalWidth: width, naturalHeight: height } = image;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  const pixels = new Uint8Array(width * height);
  for (let index = 0; index < pixels.length; index++) {
    const offset = index * 4;
    pixels[index] = Math.round(
      data[offset] * 0.3 + data[offset + 1] * 0.59 + data[offset + 2] * 0.11,
    );
  }
  canvas.width = canvas.height = 0;
  return {
    width,
    height,
    pixels,
    centerX: width * 0.369,
    centerY: height * 0.49,
  };
}

function createFlowMap(texture, view, width, height) {
  const { centerX, centerY } = texture;
  const map = new Float32Array(width * height * 5);
  for (let row = 0, offset = 0; row < height; row++) {
    const y = (((row + 0.5) * view.height) / height - view.y) / view.zoom;
    for (let column = 0; column < width; column++, offset += 5) {
      const x = (((column + 0.5) * view.width) / width - view.x) / view.zoom;
      const dx = x - centerX;
      const dy = y - centerY;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const eddy = Math.sin(3 * angle + radius * 0.037);
      const speed = Math.min(radius * 0.78, 86) * (0.77 + 0.23 * eddy);
      const pull = 0.45 + 0.14 * eddy;
      map[offset] = x - 0.5;
      map[offset + 1] = y - 0.5;
      map[offset + 2] = (Math.sin(angle) + pull * Math.cos(angle)) * speed;
      map[offset + 3] = (-Math.cos(angle) + pull * Math.sin(angle)) * speed;
      map[offset + 4] = radius * 0.0038 + 0.12 * eddy;
    }
  }
  return map;
}

function sample({ pixels, width, height }, x, y) {
  const right = width - 1;
  const bottom = height - 1;
  x = right - Math.abs(right - Math.abs(x));
  y = bottom - Math.abs(bottom - Math.abs(y));
  const left = Math.floor(x);
  const top = Math.floor(y);
  const column = Math.min(left + 1, right);
  const row = Math.min(top + 1, bottom);
  const horizontal = x - left;
  const vertical = y - top;
  const upper =
    pixels[top * width + left] * (1 - horizontal) +
    pixels[top * width + column] * horizontal;
  const lower =
    pixels[row * width + left] * (1 - horizontal) +
    pixels[row * width + column] * horizontal;
  return upper * (1 - vertical) + lower * vertical;
}

function paintFlow(texture, map, data, time) {
  const cycle = time * FLOW_RATE;
  for (
    let offset = 0, pixel = 0;
    offset < map.length;
    offset += 5, pixel += 4
  ) {
    const x = map[offset];
    const y = map[offset + 1];
    const dx = map[offset + 2];
    const dy = map[offset + 3];
    const phase = fraction(cycle + map[offset + 4]);
    const first = phase - 0.5;
    const second = fraction(phase + 0.5) - 0.5;
    const weight = 1 - Math.abs(2 * first);
    const blend = weight * weight * (3 - 2 * weight);
    const shade =
      blend * sample(texture, x + dx * first, y + dy * first) +
      (1 - blend) * sample(texture, x + dx * second, y + dy * second);
    data[pixel] = data[pixel + 1] = data[pixel + 2] = shade;
  }
}

function paintSparks(context, texture, view, time) {
  context.save();
  context.translate(
    view.x + texture.centerX * view.zoom,
    view.y + texture.centerY * view.zoom,
  );
  context.scale(view.zoom, view.zoom);
  context.fillStyle = context.strokeStyle = "white";
  context.lineCap = "round";

  for (const spark of sparks) {
    const age = fraction(time / spark.duration + spark.phase);
    const radius = 23 + spark.reach * (1 - age) ** 1.25;
    const angle = spark.angle + 1.9 * Math.log((23 + spark.reach) / radius);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const size = spark.size * (1 - age * 0.63);
    const pulse = 0.74 + 0.26 * Math.sin(TAU * (age * 3 + spark.phase));
    const glow = Math.sin(Math.PI * age) * pulse;

    context.globalAlpha = glow * 0.18;
    context.beginPath();
    context.ellipse(x, y, size * 2, size * 2, 0, 0, TAU);
    context.fill();
    context.globalAlpha = glow * 0.72;
    context.beginPath();
    if (spark.streak) {
      const tail = angle - 0.085 - size * 0.012;
      const outer = radius + size * 1.5;
      context.moveTo(Math.cos(tail) * outer, Math.sin(tail) * outer);
      context.quadraticCurveTo(
        Math.cos(angle) * outer,
        Math.sin(angle) * outer,
        x,
        y,
      );
      context.lineWidth = size * 0.72;
      context.stroke();
    } else {
      context.ellipse(x, y, size, size * 0.73, angle, 0, TAU);
      context.fill();
    }
  }
  context.restore();
}

function createVortexCanvas(canvas, texture) {
  const flow = document.createElement("canvas");
  const flowContext = flow.getContext("2d");
  if (!flowContext) return null;
  let frame;
  let map;
  let view;
  let ready = false;

  return createCanvasAnimation(canvas, {
    resize({ width, height, scale }) {
      const zoom = Math.max(width / texture.width, height / texture.height);
      view = {
        width,
        height,
        zoom,
        x: (width - texture.width * zoom) / 2,
        y: (height - texture.height * zoom) / 2,
      };
      const resolution = Math.min(
        scale,
        MAX_FLOW_WIDTH / width,
        MAX_FLOW_HEIGHT / height,
      );
      flow.width = Math.max(1, Math.round(width * resolution));
      flow.height = Math.max(1, Math.round(height * resolution));
      frame = flowContext.createImageData(flow.width, flow.height);
      frame.data.fill(255);
      map = createFlowMap(texture, view, flow.width, flow.height);
    },
    paint({ context, width, height, time }) {
      paintFlow(texture, map, frame.data, time);
      flowContext.putImageData(frame, 0, 0);
      context.drawImage(flow, 0, 0, width, height);
      paintSparks(context, texture, view, time);
      if (!ready) {
        ready = true;
        canvas.setAttribute("data-vortex-ready", "");
      }
    },
    dispose() {
      canvas.removeAttribute("data-vortex-ready");
      flow.width = flow.height = 0;
    },
  });
}

export async function loadVortexRenderer(source) {
  texturePromise ??= loadTexture(source).catch((error) => {
    texturePromise = undefined;
    throw error;
  });
  const texture = await texturePromise;
  return (canvas) => createVortexCanvas(canvas, texture);
}

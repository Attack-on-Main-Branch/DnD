import { createCanvasAnimation } from "./canvas-animation.mjs";

const SPRITE_WIDTH = 32;
const SPRITE_HEIGHT = 128;
const STREAK_WIDTH = 8;

function streakSprite(color) {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_WIDTH;
  sprite.height = SPRITE_HEIGHT;
  const context = sprite.getContext("2d");
  if (!context) return null;

  const x = SPRITE_WIDTH / 2;
  const end = SPRITE_HEIGHT - STREAK_WIDTH / 2;
  const gradient = context.createLinearGradient(0, 0, 0, end);
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, color);
  context.strokeStyle = gradient;
  context.lineWidth = STREAK_WIDTH;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x, STREAK_WIDTH / 2);
  context.lineTo(x, end);
  context.stroke();
  return sprite;
}

export function createStormRain(canvas, color) {
  const sprite = streakSprite(color);
  if (!sprite) return null;
  let drops = [];

  function resetDrop(drop, width, height, randomY = false) {
    const depth = 0.15 + Math.random() ** 1.25 * 0.85;
    drop.x = -10 + Math.random() * (width + height * 0.45 + 20);
    drop.y = randomY ? Math.random() * height : -30;
    drop.glow = depth > 0.88;
    drop.speed = height * (0.65 + depth * 2 + Math.random() * 0.6);
    drop.length = (4 + depth * 28) * Math.max(0.5, width / 1000);
    drop.thickness = (0.6 + depth ** 3 * 1.8) * (SPRITE_WIDTH / STREAK_WIDTH);
    drop.opacity = 0.14 + Math.random() * 0.18 + depth * 0.15;
    drop.phase = Math.random() * Math.PI * 2;
    return drop;
  }

  function paint({ context, width, height, scale, time }, dt) {
    context.clearRect(0, 0, width, height);
    const wind =
      -0.3 + Math.sin(time * 0.45) * 0.13 + Math.sin(time * 0.91) * 0.04;
    for (const particle of drops) {
      particle.y += particle.speed * dt;
      particle.x += particle.speed * wind * dt;
      if (particle.y > height + 35 || particle.x < -35) {
        resetDrop(particle, width, height);
        continue;
      }
      const fade = Math.min(
        1,
        particle.y / 20,
        (height + 20 - particle.y) / 35,
      );
      if (fade <= 0 || particle.x > width) continue;
      const light = 0.8 + Math.sin(time * 1.3 + particle.phase) * 0.2;
      context.globalAlpha = particle.opacity * light * fade;
      context.setTransform(
        scale,
        0,
        wind * scale,
        scale,
        particle.x * scale,
        particle.y * scale,
      );
      const { length, thickness } = particle;
      context.drawImage(sprite, -thickness / 2, -length, thickness, length);
      if (particle.glow) {
        context.globalAlpha *= 0.18;
        context.drawImage(
          sprite,
          -thickness * 2,
          -length,
          thickness * 4,
          length,
        );
      }
    }
    context.globalAlpha = 1;
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function resize({ width, height }) {
    drops = Array.from(
      {
        length: Math.min(
          460,
          Math.max(110, Math.round((width * height) / 1100)),
        ),
      },
      () => resetDrop({}, width, height, true),
    );
  }

  const animation = createCanvasAnimation(canvas, {
    paint,
    resize,
    maxDelta: 0.06,
    dispose() {
      drops = [];
      sprite.width = sprite.height = 0;
    },
  });
  if (!animation) sprite.width = sprite.height = 0;
  return animation;
}

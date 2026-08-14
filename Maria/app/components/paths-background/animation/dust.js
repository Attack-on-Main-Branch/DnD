/**
 * Floating light motes — the white specks drifting through the ED.
 *
 * Two populations share one pool: crisp pin-points near the focal plane and
 * large out-of-focus bokeh discs. Both rise slowly with a lateral sine drift
 * and wrap around the viewport, so the field never runs dry.
 */

const TAU = Math.PI * 2;
const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const rand = (min, max) => min + Math.random() * (max - min);

export class DustField {
  constructor(width, height) {
    /** @type {object[]} */
    this.motes = [];
    this.time = 0;
    this.setSize(width, height);
  }

  setSize(width, height) {
    const prevW = this.width || width;
    const prevH = this.height || height;
    this.width = width;
    this.height = height;
    this.scale = clamp(Math.min(width, height) / 820, 0.6, 1.8);

    const target = clamp(Math.round((width * height) / 5200), 80, 460);

    // Keep existing motes (rescaled into the new box) so a resize doesn't
    // blink the whole field out of existence.
    for (const m of this.motes) {
      m.x = (m.x / prevW) * width;
      m.y = (m.y / prevH) * height;
    }
    while (this.motes.length > target) this.motes.pop();
    while (this.motes.length < target) this.motes.push(this.makeMote(true));
  }

  makeMote(anywhere) {
    const bokeh = Math.random() < 0.34;
    const s = this.scale;
    return {
      x: Math.random() * this.width,
      y: anywhere ? Math.random() * this.height : this.height + rand(10, 90),
      bokeh,
      r: (bokeh ? rand(2.8, 15) : rand(0.45, 2.1)) * s,
      alpha: bokeh ? rand(0.04, 0.19) : rand(0.4, 0.95),
      // Most motes rise; a few settle, which keeps the field from reading as a
      // single scrolling sheet.
      vy: (Math.random() < 0.76 ? rand(-27, -5) : rand(3, 13)) * s,
      drift: rand(3, 16) * s,
      phase: Math.random() * TAU,
      phaseSpeed: rand(0.15, 0.7),
      twinkle: rand(0.25, 0.75),
      twinkleSpeed: rand(0.6, 2.4),
    };
  }

  step(dt) {
    this.time += dt;
    const { width, height } = this;

    for (const m of this.motes) {
      m.phase += m.phaseSpeed * dt;
      m.x += Math.sin(m.phase) * m.drift * dt;
      m.y += m.vy * dt;

      const pad = m.r + 24;
      if (m.y < -pad) {
        m.y = height + pad;
        m.x = Math.random() * width;
      } else if (m.y > height + pad) {
        m.y = -pad;
        m.x = Math.random() * width;
      }
      if (m.x < -pad) m.x = width + pad;
      else if (m.x > width + pad) m.x = -pad;
    }
  }

  /** Current opacity of a mote, including its twinkle. */
  opacity(m) {
    return (
      m.alpha *
      (1 -
        m.twinkle * 0.5 +
        Math.sin(this.time * m.twinkleSpeed + m.phase) * m.twinkle * 0.5)
    );
  }
}

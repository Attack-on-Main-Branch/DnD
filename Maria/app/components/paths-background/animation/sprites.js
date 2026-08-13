/**
 * Pre-rendered radial sprites.
 *
 * Building a `createRadialGradient` per particle per frame is the single
 * easiest way to tank this animation, so the two dot shapes are baked once
 * into offscreen canvases and blitted with `drawImage` afterwards.
 */

const SPRITE_SIZE = 96

function makeSprite(paint) {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  const half = SPRITE_SIZE / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  paint(gradient)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
  return canvas
}

export function createSprites() {
  return {
    /** Crisp mote: hot white centre falling off fast into a warm halo. */
    spark: makeSprite((g) => {
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.16, 'rgba(255,253,242,0.88)')
      g.addColorStop(0.36, 'rgba(255,241,206,0.26)')
      g.addColorStop(0.7, 'rgba(255,226,160,0.06)')
      g.addColorStop(1, 'rgba(255,214,130,0)')
    }),

    /** Out-of-focus mote: flat disc with a brighter rim, like real bokeh. */
    bokeh: makeSprite((g) => {
      g.addColorStop(0, 'rgba(255,253,242,0.42)')
      g.addColorStop(0.55, 'rgba(255,250,232,0.5)')
      g.addColorStop(0.86, 'rgba(255,246,214,0.82)')
      g.addColorStop(0.97, 'rgba(255,236,190,0.18)')
      g.addColorStop(1, 'rgba(255,230,170,0)')
    }),

    /** Warm flare used for the pulsing tips of burnt-out branches. */
    bulb: makeSprite((g) => {
      g.addColorStop(0, 'rgba(255,255,246,1)')
      g.addColorStop(0.14, 'rgba(255,247,206,0.8)')
      g.addColorStop(0.34, 'rgba(255,206,102,0.28)')
      g.addColorStop(0.68, 'rgba(238,146,36,0.07)')
      g.addColorStop(1, 'rgba(200,96,16,0)')
    }),
  }
}

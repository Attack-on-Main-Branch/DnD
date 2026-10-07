import { useId } from "react";
import {
  FLARE_MS,
  FLARE_RECIPES,
  FLARE_ATMOSPHERES,
  GRADIENT_FILLS,
  PATH_LENGTHS,
  SEAL_MARKS,
  atmosphereTrails,
  glyphPlacements,
  motePlacements,
  shapeOf,
} from "./flare-presentation";

export default function Flare({ flare }) {
  // `useId` carries characters a `url(#…)` reference does not survive.
  const id = `flare${useId().replace(/[^\w-]/g, "")}`;

  return (
    <span
      aria-hidden="true"
      data-flare={flare}
      className="flare"
      style={{ "--flare-life": `${FLARE_MS}ms` }}
    >
      <span className="flare-aura" />
      <span className="flare-light" />
      <span className="flare-shockwave" />
      <span className="flare-shockwave flare-shockwave-echo" />

      <svg viewBox="-50 -50 100 100" className="flare-field">
        <defs>
          <radialGradient id={`${id}-soft`}>
            <stop offset="0" className="flare-stop-core" />
            <stop offset="0.45" className="flare-stop-a" />
            <stop offset="1" className="flare-stop-fade" />
          </radialGradient>

          <linearGradient id={`${id}-tongue`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className="flare-stop-core" />
            <stop offset="0.22" className="flare-stop-a" />
            <stop offset="0.7" className="flare-stop-b" />
            <stop offset="1" className="flare-stop-fade" />
          </linearGradient>

          <linearGradient id={`${id}-blaze`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className="flare-stop-a" />
            <stop offset="0.4" className="flare-stop-b" />
            <stop offset="0.95" className="flare-stop-fade" />
          </linearGradient>

          <linearGradient id={`${id}-trail`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className="flare-stop-fade" />
            <stop offset="0.35" className="flare-stop-b" />
            <stop offset="0.7" className="flare-stop-core" />
            <stop offset="1" className="flare-stop-fade" />
          </linearGradient>
        </defs>

        <Atmosphere flare={flare} gradients={id} />

        {FLARE_RECIPES[flare].map((layer, index) => (
          <Layer key={index} layer={layer} gradients={id} />
        ))}
      </svg>
    </span>
  );
}

function Atmosphere({ flare, gradients }) {
  const { trail, mist, seal } = FLARE_ATMOSPHERES[flare];

  return (
    <>
      <g className="flare-mist">
        {motePlacements({ count: mist, at: 32, spread: 850 }).map(
          ({ x, y, sway, delay }, index) => (
            <g
              key={index}
              className="flare-cloud"
              style={{
                "--x": `${x}px`,
                "--y": `${y}px`,
                "--s": `${sway}px`,
                animationDelay: `${delay}ms`,
              }}
            >
              <circle
                r={8 + (index % 3) * 2}
                fill={`url(#${gradients}-soft)`}
              />
            </g>
          ),
        )}
      </g>
      {seal && (
        <g className="flare-seal">
          <g className="flare-spin" data-spin="cw-slow">
            <circle r="39" />
            <circle r="32" />
            {SEAL_MARKS.map(({ d, transform }, index) => (
              <path key={index} d={d} transform={transform} />
            ))}
          </g>
          <g className="flare-spin" data-spin="ccw">
            <circle r="29" strokeDasharray="18 5 1 5" />
          </g>
        </g>
      )}
      <g className="flare-trails" data-trail={trail}>
        {atmosphereTrails(flare).map(
          ({ d, transform, delay, duration }, index) => (
            <g key={index} transform={transform}>
              <g
                className="flare-trail"
                style={{
                  animationDelay: `${delay}ms`,
                  animationDuration: `${duration}ms`,
                }}
              >
                <path className="flare-trail-bloom" d={d} pathLength="100" />
                <path
                  d={d}
                  pathLength="100"
                  stroke={`url(#${gradients}-trail)`}
                />
              </g>
            </g>
          ),
        )}
      </g>
    </>
  );
}

function Layer({ layer, gradients }) {
  const items =
    layer.kind === "glyph"
      ? glyphPlacements(layer).map(({ transform, delay }, index) => (
          <g key={index} transform={transform}>
            <Shape
              shape={layer.shape}
              index={index}
              gradients={gradients}
              motion={layer.motion}
              style={{ animationDelay: `${delay}ms` }}
            />
          </g>
        ))
      : motePlacements(layer).map(({ x, y, sway, delay }, index) => (
          <g
            key={index}
            className="flare-motion"
            data-motion={layer.motion}
            style={{
              "--x": `${x}px`,
              "--y": `${y}px`,
              "--s": `${sway}px`,
              animationDelay: `${delay}ms`,
            }}
          >
            <Shape shape={layer.shape} index={index} gradients={gradients} />
          </g>
        ));

  return layer.spin ? (
    <g className="flare-spin" data-spin={layer.spin}>
      {items}
    </g>
  ) : (
    items
  );
}

function Shape({ shape, index, gradients, motion, style }) {
  const { circle, d } = shapeOf(shape, index);
  const gradient = GRADIENT_FILLS[shape];

  const props = {
    "data-shape": shape,
    className: motion ? "flare-motion" : undefined,
    "data-motion": motion,
    fill: gradient ? `url(#${gradients}-${gradient})` : undefined,
    style,
  };

  return circle ? (
    <circle r={circle} {...props} />
  ) : (
    <path d={d} pathLength={PATH_LENGTHS[shape]} {...props} />
  );
}

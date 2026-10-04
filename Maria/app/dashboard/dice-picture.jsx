/**
 * A premade picture of a die, in any colour: the colour laid underneath and
 * cut to the tint, which also carries how brightly the body is lit, with the
 * skin over the top — see scripts/dice-thumbnails.mjs. No WebGL, so a grid of
 * these costs what a grid of images costs.
 *
 * `cell` picks one die out of a strip of `cells`.
 */
export default function DicePicture({
  picture,
  color,
  cell = 0,
  cells = 1,
  className = "",
}) {
  const size = `${cells * 100}% 100%`;
  const position = cells > 1 ? `${(cell / (cells - 1)) * 100}% 0%` : "0% 0%";
  const mask = `url(${picture.tint})`;

  return (
    <span aria-hidden="true" className={`relative block ${className}`}>
      <span
        className="absolute inset-0"
        style={{
          backgroundColor: color,
          maskImage: mask,
          WebkitMaskImage: mask,
          maskSize: size,
          WebkitMaskSize: size,
          maskPosition: position,
          WebkitMaskPosition: position,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
      <span
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: `url(${picture.src})`,
          backgroundSize: size,
          backgroundPosition: position,
        }}
      />
    </span>
  );
}

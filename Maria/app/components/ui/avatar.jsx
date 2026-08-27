const SIZE_CLASSES = {
  /* The map's tokens: small enough that two side by side still leave the
     ground between them readable. */
  xs: "size-7",
  sm: "size-10",
  md: "size-14",
  lg: "size-20",
};

/**
 * A character's face, wherever one is shown: the portrait they uploaded, or a
 * silhouette on the colour they chose until they do.
 *
 * `aria-hidden` because the character's name is always rendered next to it —
 * announcing a portrait before "Darth Vader" is noise, not information. The
 * `<img>` therefore carries an empty `alt` rather than a name that would be
 * read twice.
 *
 * Takes the URL and the colour class ready-made rather than deriving them:
 * `components/` never imports from a route directory, or the primitive cannot
 * be reused outside the dashboard.
 *
 * A PLAIN `<img>` AND NOT `next/image`. The source is a Supabase public URL
 * whose host is an environment variable, so `remotePatterns` cannot be written
 * without pinning a deployment's project into the config; the object is a
 * 512px WebP the browser already re-encoded, which is the whole of what the
 * optimiser would have done to it; and it is immutable — the path carries a
 * stamp — so the CDN answers the second request without us.
 *
 * `ring` is the pale edge that lifts a portrait off whatever it is standing on.
 * Off where the avatar IS an edge — a party pill's face sits flush in the
 * capsule's own outline, and a second ring inside it reads as two rims.
 */
export default function Avatar({
  src = null,
  colorClass,
  size = "md",
  ring = true,
  className = "",
}) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        ring ? "ring-2 ring-white/20" : ""
      } ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} ${
        src ? "bg-surface" : colorClass
      } ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <Silhouette />
      )}
    </span>
  );
}

/**
 * Exported as well as used above, for the one place a portrait is CHOSEN: the
 * creation sheet's upload zone is an avatar before it is a control, and an
 * empty disc there would be the only place in the app where "no picture yet"
 * looks like something other than this.
 *
 * The cameo cut into a signet: a bust in profile-less relief, pale on the
 * character's own colour. Drawn rather than lettered because initials on a disc
 * are a placeholder that looks like a decision, and this one reads as a frame
 * waiting for a picture.
 *
 * Two tones and no gradient stop of its own — the highlight is the same fill at
 * a second opacity, so the shape survives at 28px on the map and still has
 * depth at 80px on the sheet.
 */
export function Silhouette() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-full text-white"
      fill="none"
      aria-hidden="true"
    >
      {/* The ground, darkened towards the rim so the disc reads as struck
          metal rather than as flat paint. */}
      <circle cx="16" cy="16" r="16" fill="currentColor" fillOpacity="0.08" />

      <g fill="currentColor" fillOpacity="0.72">
        <circle cx="16" cy="12.1" r="6.1" />

        {/* Shoulders, taken to the bottom edge: a bust that stops short of the
            rim floats, and the circle above is doing the framing already. */}
        <path d="M16 19.4c6.2 0 11.3 4.6 11.9 10.5l.1 2.1H4l.1-2.1C4.7 24 9.8 19.4 16 19.4Z" />
      </g>
    </svg>
  );
}

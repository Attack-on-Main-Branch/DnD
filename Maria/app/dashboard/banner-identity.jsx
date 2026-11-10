export default function BannerIdentity({
  portrait,
  name,
  discriminator,
  subtitle,
  trailing,
  heading = false,
  contrast = false,
}) {
  const Name = heading ? "h2" : "p";
  return (
    <div className="relative flex items-center gap-3">
      {portrait}
      <div className="mr-(--banner-name-gap) min-w-0 flex-1">
        <Name
          className={`truncate font-display text-lg font-semibold tracking-wide ${contrast ? "text-(--banner-heading)" : "text-ink"}`}
        >
          {name}
        </Name>
        <p
          className={`font-mono text-xs ${contrast ? "text-(--banner-tag)" : "text-gold/70"}`}
        >
          #{discriminator}
        </p>
        <p
          className={`mt-0.5 truncate font-display text-[0.625rem] tracking-[0.15em] uppercase ${contrast ? "text-(--banner-detail)" : "text-ink/50"}`}
        >
          {subtitle}
        </p>
      </div>
      {trailing}
    </div>
  );
}

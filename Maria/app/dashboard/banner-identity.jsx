export default function BannerIdentity({
  portrait,
  name,
  discriminator,
  subtitle,
  trailing,
  heading = false,
}) {
  const Name = heading ? "h2" : "p";
  return (
    <div className="relative flex items-center gap-3">
      {portrait}
      <div className="mr-(--banner-name-gap) min-w-0 flex-1">
        <Name className="truncate font-display text-lg font-semibold tracking-wide text-ink">
          {name}
        </Name>
        <p className="font-mono text-xs text-gold">#{discriminator}</p>
        <p className="mt-0.5 truncate font-display text-[0.625rem] tracking-[0.15em] text-ink uppercase">
          {subtitle}
        </p>
      </div>
      {trailing}
    </div>
  );
}

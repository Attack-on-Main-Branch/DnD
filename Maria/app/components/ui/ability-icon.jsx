const GLYPHS = {
  str: (
    <>
      <path d="m14.5 3 6.5 0 0 6.5-9 9-6.5-6.5Z" />
      <path d="m4 10 10 10M3 21l5-5M3 17l4 4M10 14l7-7" />
    </>
  ),
  dex: (
    <>
      <path d="M5 3c8 1 13 6 16 16C11 16 6 11 5 3Z" />
      <path d="m5 3 16 16M4 20 17 7M13 7h4v4M3 17v4h4" />
    </>
  ),
  con: (
    <>
      <path d="M12 3 3.5 6v5.5c0 4.8 4.6 8.1 8.5 10 3.9-1.9 8.5-5.2 8.5-10V6Z" />
      <path d="M12 16s-4.5-2.8-4.5-5.4a2.5 2.5 0 0 1 4.5-1.3 2.5 2.5 0 0 1 4.5 1.3C16.5 13.2 12 16 12 16Z" />
    </>
  ),
  int: (
    <>
      <path d="M12 5c-2.5-2-6.5-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2.5-1-6.5-1-9 1Z" />
      <path d="M12 5v15M6 8l3 .5M6 12l3 .5M15 8.5l3-.5M15 12.5l3-.5" />
    </>
  ),
  wis: (
    <>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v1M5 4l1 1M19 4l-1 1M12 21v1" />
    </>
  ),
  cha: (
    <>
      <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5Z" />
      <path d="M5 16h14M10.5 12 12 10l1.5 2-1.5 2Z" />
      <circle cx="3" cy="5" r="1" />
      <circle cx="21" cy="5" r="1" />
    </>
  ),
};

export default function AbilityIcon({ ability, className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {GLYPHS[ability] ?? GLYPHS.wis}
    </svg>
  );
}

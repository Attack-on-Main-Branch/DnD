/*
 * `remotePatterns` is an allow-list, so maps cannot be optimised without naming
 * the Supabase host. Derived from the environment rather than written out, so a
 * clone pointed at another project needs no config edit.
 *
 * Scoped to the one public bucket, not the whole origin: the optimiser fetches
 * whatever URL it is handed, so a wildcard would make it an open proxy for any
 * path on the storage host.
 *
 * Resolved against the URL rather than concatenated: a trailing slash in the
 * env value made `//storage/…`, a pattern no real URL matches.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const campaignMaps = supabaseUrl
  ? [new URL("/storage/v1/object/public/campaign-maps/**", supabaseUrl)]
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: campaignMaps,

    /*
     * A year: the object name carries the campaign's uuid and uploads are
     * `upsert: false`, so these URLs never change what they point at. The
     * effective age is this or the upstream `Cache-Control`, whichever is
     * larger — both are set to a year, see Sina/src/data/campaigns.js.
     */
    minimumCacheTTL: 31536000,
  },
  // Sina ships as untranspiled ESM, so Next compiles it alongside the app.
  // This is also what inlines NEXT_PUBLIC_* values for the browser build.
  transpilePackages: ["sina"],

  /*
   * Off, because Next's own gzip leaks a `drain` listener every time a large
   * page stalls on a slow reader (`res.once` is forwarded to the zlib stream
   * but removed from the response), which trips Node's MaxListeners warning.
   * Vercel compresses at its edge, so this only ever ran in local dev.
   */
  compress: false,

  experimental: {
    /*
     * Maps travel in a Server Action's form body, because an `httpOnly` session
     * cookie is invisible to a browser Supabase client.
     *
     * THREE CEILINGS, AND THE LOWEST HAS TO BE OURS: MAX_UPLOAD_BYTES in
     * Sina/src/rules/campaign.js sits under this, and this under the 4.5MB a
     * Vercel function accepts. A body over either of the two above is refused
     * before our code runs, and answered with a stack trace or a 413.
     */
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;

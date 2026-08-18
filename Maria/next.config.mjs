/*
 * The Supabase project's own host, taken from the environment rather than
 * written out.
 *
 * `remotePatterns` is an allow-list, and next/image refuses any host not on it
 * — so campaign maps cannot be optimised without naming this one. Deriving it
 * from `NEXT_PUBLIC_SUPABASE_URL` is what keeps that from being a project id
 * baked into the repository: anyone who clones this and points it at their own
 * project gets their own host with no config edit.
 *
 * Scoped to the one public bucket, not the whole origin. The optimiser fetches
 * whatever URL it is handed, so a wildcard here would make it a proxy for any
 * path on the storage host.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const campaignMaps = supabaseUrl
  ? [new URL(`${supabaseUrl}/storage/v1/object/public/campaign-maps/**`)]
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: campaignMaps,

    /*
     * A year, because these URLs never change what they point at: the object
     * name carries the campaign's uuid, uploads are `upsert: false`, and a
     * replaced map would be a new campaign with a new id.
     *
     * This governs how long Next keeps its own derivative; the docs say the
     * effective age is this or the upstream `Cache-Control`, whichever is
     * larger. Both are set to a year for that reason — see the upload in
     * Sina/src/data/campaigns.js.
     */
    minimumCacheTTL: 31536000,
  },
  // Sina ships as untranspiled ESM source rather than a build artefact, so
  // Next compiles it alongside the app. This is also what lets the bundler
  // inline NEXT_PUBLIC_* values inside the package for the browser build.
  transpilePackages: ["sina"],

  experimental: {
    /*
     * Campaign maps travel to the server inside a Server Action's form body,
     * because an `httpOnly` session cookie is invisible to a browser Supabase
     * client — see the note on `createCampaign`. The default cap is 1MB, which
     * a map clears even after the browser has re-encoded it to WebP.
     *
     * One step above MAX_MAP_BYTES in Sina/src/rules/campaign.js, and the gap
     * is the point: a body over this limit is refused by the framework before
     * any of our code runs, so the user would get a stack trace instead of a
     * sentence. Leaving room means our own check is always the one that speaks.
     */
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;

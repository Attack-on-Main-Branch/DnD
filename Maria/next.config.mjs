/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sina ships as untranspiled ESM source rather than a build artefact, so
  // Next compiles it alongside the app. This is also what lets the bundler
  // inline NEXT_PUBLIC_* values inside the package for the browser build.
  transpilePackages: ["sina"],
};

export default nextConfig;

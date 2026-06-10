import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from
// https://<user>.github.io/Test, so assets need the /Test base path.
// `BASE_PATH` is set by the Pages workflow; locally it defaults to "".
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  // Exposed to the client so the service worker can be registered at the
  // correct sub-path on GitHub Pages.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;

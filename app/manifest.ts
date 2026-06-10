import type { MetadataRoute } from "next";

// Required for `output: export` (the manifest is generated at build time).
export const dynamic = "force-static";

// Served from a sub-path on GitHub Pages, so URLs in the manifest need the
// same base path the app is built with.
const base = process.env.BASE_PATH ?? "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocket Money Tracker",
    short_name: "Pocket Money",
    description: "Track each child's pocket money, allowance, bonuses and savings goals.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f6",
    theme_color: "#4338ca",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: `${base}/icons/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

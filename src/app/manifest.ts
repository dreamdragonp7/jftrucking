import type { MetadataRoute } from "next";

/** PWA Web App Manifest for J Fudge Trucking. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "J Fudge Trucking",
    short_name: "JFT",
    description:
      "Transportation Management System for J Fudge Trucking — aggregate hauling dispatch, delivery tracking, and invoicing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F5E6D3",
    theme_color: "#4C1C06",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/jftlogo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "logistics", "transportation"],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JFT - J Fudge Trucking",
    short_name: "JFT",
    description:
      "Transportation Management System for J Fudge Trucking — dispatch, delivery tracking, and invoicing.",
    start_url: "/",
    display: "standalone",
    background_color: "#4C1C06",
    theme_color: "#4C1C06",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/jftlogo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    categories: ["business", "logistics", "transportation"],
  };
}

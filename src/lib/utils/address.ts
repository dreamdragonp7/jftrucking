/**
 * Address utilities for the trucker portal.
 * Handles formatting, clipboard copy, and opening maps apps.
 * NO GPS tracking — just address display and navigation.
 */

import type { Site } from "@/types/database";

/**
 * Format a site object into a full address string.
 * Returns the site name if no address fields are populated.
 */
export function formatAddress(site: Site | null | undefined): string {
  if (!site) return "Unknown location";

  const parts: string[] = [];
  if (site.address) parts.push(site.address);
  if (site.city) parts.push(site.city);
  if (site.state && site.zip) {
    parts.push(`${site.state} ${site.zip}`);
  } else if (site.state) {
    parts.push(site.state);
  } else if (site.zip) {
    parts.push(site.zip);
  }

  return parts.length > 0 ? parts.join(", ") : site.name;
}

/**
 * Format a short address (city + state only) for compact display.
 */
export function formatShortAddress(site: Site | null | undefined): string {
  if (!site) return "Unknown";
  if (site.city && site.state) return `${site.city}, ${site.state}`;
  if (site.city) return site.city;
  return site.name;
}

/**
 * Copy text to clipboard.
 * Uses the modern Clipboard API with fallback.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for non-HTTPS contexts (unlikely in production)
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

/**
 * Detect if the user is on an iOS device.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Open an address in the native maps app.
 * - iOS: Opens Apple Maps
 * - Android/other: Opens Google Maps
 *
 * The address is URL-encoded and passed as a search query.
 */
export function openInMaps(address: string): void {
  const encoded = encodeURIComponent(address);

  if (isIOS()) {
    // Apple Maps
    window.open(`https://maps.apple.com/?q=${encoded}`, "_blank");
  } else {
    // Google Maps (works on Android + desktop)
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      "_blank"
    );
  }
}

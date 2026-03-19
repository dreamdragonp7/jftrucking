"use client";

import { useState, useLayoutEffect, useEffect } from "react";

export interface MediaQueryResult {
  /** Whether the media query currently matches */
  matches: boolean;
  /** Whether the value has been measured (false during SSR) */
  isReady: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * SSR-safe hook for media query matching.
 * Uses window.matchMedia for performance (no resize event listeners).
 * Returns both the match state and an isReady flag for SSR safety.
 */
export function useMediaQuery(query: string): MediaQueryResult {
  const [result, setResult] = useState<MediaQueryResult>({
    matches: false,
    isReady: false,
  });

  useIsomorphicLayoutEffect(() => {
    const mediaQuery = window.matchMedia(query);

    setResult({
      matches: mediaQuery.matches,
      isReady: true,
    });

    const handler = (event: MediaQueryListEvent) => {
      setResult({
        matches: event.matches,
        isReady: true,
      });
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return result;
}

/** Predefined breakpoint queries matching Tailwind defaults */
export const BREAKPOINTS = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  "2xl": "(min-width: 1536px)",
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
} as const;

export function useIsMobile(): MediaQueryResult {
  return useMediaQuery(BREAKPOINTS.mobile);
}

export function useIsTablet(): MediaQueryResult {
  return useMediaQuery(BREAKPOINTS.tablet);
}

export function useIsDesktop(): MediaQueryResult {
  return useMediaQuery(BREAKPOINTS.desktop);
}

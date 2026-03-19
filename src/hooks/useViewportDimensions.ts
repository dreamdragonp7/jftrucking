"use client";

import { useState, useLayoutEffect, useEffect } from "react";

export interface ViewportDimensions {
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
  /** Whether dimensions have been measured (false during SSR) */
  isReady: boolean;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * SSR-safe hook for viewport dimensions.
 * Uses useLayoutEffect to capture dimensions synchronously on mount.
 * Includes resize listener for responsive updates.
 */
export function useViewportDimensions(): ViewportDimensions {
  const [dimensions, setDimensions] = useState<ViewportDimensions>({
    width: 0,
    height: 0,
    isReady: false,
  });

  useIsomorphicLayoutEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        isReady: true,
      });
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions, { passive: true });
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  return dimensions;
}

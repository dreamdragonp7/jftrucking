'use client';

import { useState, useEffect } from 'react';

/**
 * Breakpoint type matching Tailwind CSS default breakpoints
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Breakpoint pixel values (Tailwind defaults)
 */
const BREAKPOINT_VALUES: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Get current breakpoint based on window width
 */
function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINT_VALUES['2xl']) return '2xl';
  if (width >= BREAKPOINT_VALUES.xl) return 'xl';
  if (width >= BREAKPOINT_VALUES.lg) return 'lg';
  if (width >= BREAKPOINT_VALUES.md) return 'md';
  if (width >= BREAKPOINT_VALUES.sm) return 'sm';
  return 'xs';
}

/**
 * useBreakpoint -- React hook for responsive design
 *
 * Returns the current Tailwind breakpoint based on viewport width.
 * Uses efficient ResizeObserver instead of window resize events.
 *
 * @returns Current breakpoint ('xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint();
 *
 * if (breakpoint === 'xs' || breakpoint === 'sm') {
 *   // Mobile layout
 * }
 *
 * const isMobile = isMobileBreakpoint(breakpoint);
 * const isDesktop = isDesktopBreakpoint(breakpoint);
 * ```
 */
export function useBreakpoint(): Breakpoint {
  // Default to 'lg' for SSR to match desktop-first approach
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial breakpoint
    setBreakpoint(getBreakpoint(window.innerWidth));

    // Create resize observer for efficient updates
    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth;
      setBreakpoint(getBreakpoint(width));
    });

    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return breakpoint;
}

/** Helper to check if current breakpoint is mobile (xs or sm) */
export function isMobileBreakpoint(bp: Breakpoint): boolean {
  return bp === 'xs' || bp === 'sm';
}

/** Helper to check if current breakpoint is tablet (md) */
export function isTabletBreakpoint(bp: Breakpoint): boolean {
  return bp === 'md';
}

/** Helper to check if current breakpoint is desktop or larger (lg, xl, 2xl) */
export function isDesktopBreakpoint(bp: Breakpoint): boolean {
  return bp === 'lg' || bp === 'xl' || bp === '2xl';
}

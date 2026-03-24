'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Safe area inset values in pixels
 */
export interface SafeAreaInsets {
  /** Top safe area inset (notch on iPhones) */
  top: number;
  /** Right safe area inset (landscape mode on notched devices) */
  right: number;
  /** Bottom safe area inset (home indicator on iPhones) */
  bottom: number;
  /** Left safe area inset (landscape mode on notched devices) */
  left: number;
}

/**
 * Module-level cache for the test element.
 * Created once and reused to prevent DOM thrashing.
 */
let cachedTestElement: HTMLDivElement | null = null;

/**
 * Reference count for the cached test element.
 * Element is removed from DOM when count reaches 0.
 */
let testElementRefCount = 0;

function getOrCreateTestElement(): HTMLDivElement {
  if (cachedTestElement && document.body.contains(cachedTestElement)) {
    return cachedTestElement;
  }

  const testElement = document.createElement('div');
  testElement.style.position = 'fixed';
  testElement.style.left = '0';
  testElement.style.top = '0';
  testElement.style.width = '0';
  testElement.style.height = '0';
  testElement.style.visibility = 'hidden';
  testElement.style.pointerEvents = 'none';

  testElement.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  testElement.style.paddingRight = 'env(safe-area-inset-right, 0px)';
  testElement.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  testElement.style.paddingLeft = 'env(safe-area-inset-left, 0px)';

  document.body.appendChild(testElement);
  cachedTestElement = testElement;

  return testElement;
}

function acquireTestElement(): void {
  testElementRefCount++;
}

function releaseTestElement(): void {
  testElementRefCount--;

  if (testElementRefCount <= 0) {
    testElementRefCount = 0;
    if (cachedTestElement && document.body.contains(cachedTestElement)) {
      document.body.removeChild(cachedTestElement);
    }
    cachedTestElement = null;
  }
}

function parseCSSPixelValue(value: string): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const testElement = getOrCreateTestElement();
  const computedStyle = getComputedStyle(testElement);

  return {
    top: parseCSSPixelValue(computedStyle.paddingTop),
    right: parseCSSPixelValue(computedStyle.paddingRight),
    bottom: parseCSSPixelValue(computedStyle.paddingBottom),
    left: parseCSSPixelValue(computedStyle.paddingLeft),
  };
}

/**
 * Custom hook that provides safe area inset values.
 * Useful for iOS devices with notches and home indicators (PWA mode).
 * Reacts to orientation changes.
 *
 * @returns SafeAreaInsets object with top, right, bottom, left values in pixels
 *
 * @example
 * ```tsx
 * function BottomNavigation() {
 *   const { bottom } = useSafeAreaInsets();
 *
 *   return (
 *     <nav style={{ paddingBottom: bottom }}>
 *       {// Navigation items}
 *     </nav>
 *   );
 * }
 * ```
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  const hasAcquiredRef = useRef(false);

  useEffect(() => {
    if (!hasAcquiredRef.current) {
      acquireTestElement();
      hasAcquiredRef.current = true;
    }

    const updateInsets = () => {
      setInsets(getSafeAreaInsets());
    };

    updateInsets();

    const handleOrientationChange = () => {
      requestAnimationFrame(() => {
        updateInsets();
      });
    };

    const handleResize = () => {
      updateInsets();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }

      if (hasAcquiredRef.current) {
        releaseTestElement();
        hasAcquiredRef.current = false;
      }
    };
  }, []);

  return useMemo(() => insets, [insets]);
}

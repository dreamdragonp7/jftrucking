'use client';

import { useEffect, useRef } from 'react';

/**
 * Options for the useScrollLock hook
 */
interface UseScrollLockOptions {
  /** Whether scroll lock is enabled (default: true) */
  enabled?: boolean;
  /** Reserve space for scrollbar to prevent layout shift (default: true) */
  reserveScrollBarGap?: boolean;
  /** Unique identifier for debugging and tracking (auto-generated if not provided) */
  lockId?: string;
}

/**
 * Module-level state for scroll lock management.
 *
 * Uses module-level variables intentionally to coordinate multiple
 * simultaneous scroll locks across different components (e.g., nested modals).
 *
 * How it works:
 * - lockCount tracks how many components have active locks
 * - originalStyles stores the body's styles before first lock
 * - scrollY preserves scroll position for restoration
 *
 * React StrictMode double-mounts are handled correctly -- the final state
 * is always consistent.
 */

/** Map to track active scroll locks by their unique IDs. */
const scrollLockMap = new Map<string, boolean>();

let lockCount = 0;
let originalStyles: {
  overflow: string;
  paddingRight: string;
  position: string;
  top: string;
  width: string;
} | null = null;
let scrollY = 0;

/**
 * Custom hook that locks body scroll when enabled.
 *
 * Handles multiple simultaneous locks (only unlocks when all released).
 * Prevents iOS rubber band effect and reserves scrollbar gap to prevent layout shift.
 *
 * Uses module-level state to coordinate nested modals -- only the outer lock persists.
 *
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Modal({ isOpen }) {
 *   useScrollLock({ enabled: isOpen });
 *   return isOpen ? <div>Modal content</div> : null;
 * }
 * ```
 */
export function useScrollLock(options: UseScrollLockOptions = {}): void {
  const { enabled = true, reserveScrollBarGap = true, lockId } = options;
  const isLockedRef = useRef(false);

  // Generate unique ID if not provided -- stable across re-renders
  const effectiveLockIdRef = useRef<string>(
    lockId || `scroll-lock-${Math.random().toString(36).slice(2, 9)}`
  );
  // Update if lockId prop changes
  if (lockId && lockId !== effectiveLockIdRef.current) {
    effectiveLockIdRef.current = lockId;
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Prevent duplicate locks from the same hook instance
    if (isLockedRef.current) {
      return;
    }

    const currentLockId = effectiveLockIdRef.current;
    isLockedRef.current = true;

    // Only apply styles on the first lock
    if (lockCount === 0) {
      const body = document.body;
      scrollY = window.scrollY;

      // Store original styles
      originalStyles = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      };

      // Calculate scrollbar width
      const scrollBarWidth = reserveScrollBarGap
        ? window.innerWidth - document.documentElement.clientWidth
        : 0;

      // Apply scroll lock styles
      // Using position: fixed approach for iOS compatibility
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';

      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }
    }

    // Add to lock map and increment count
    scrollLockMap.set(currentLockId, true);
    lockCount++;

    // Cleanup function
    return () => {
      if (!isLockedRef.current) {
        return;
      }

      isLockedRef.current = false;

      // Remove from lock map and decrement count
      scrollLockMap.delete(currentLockId);
      lockCount--;

      // Only restore styles when all locks are released
      if (lockCount === 0 && originalStyles !== null) {
        const body = document.body;

        // Restore original styles
        body.style.overflow = originalStyles.overflow;
        body.style.paddingRight = originalStyles.paddingRight;
        body.style.position = originalStyles.position;
        body.style.top = originalStyles.top;
        body.style.width = originalStyles.width;

        // Use requestAnimationFrame to batch DOM operations
        const savedScrollY = scrollY;
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScrollY);
        });

        originalStyles = null;
      }
    };
  }, [enabled, reserveScrollBarGap]);
}

/**
 * Debug helper -- returns current scroll lock state.
 * Only used in development for debugging nested modal/sheet scenarios.
 */
export function getScrollLockDebugInfo() {
  return {
    activeLocks: Array.from(scrollLockMap.keys()),
    lockCount,
    isLocked: lockCount > 0,
  };
}

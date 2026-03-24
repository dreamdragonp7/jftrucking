'use client';

import { useRef, useCallback, useEffect } from 'react';

export interface UseAbortControllerReturn {
  signal: AbortSignal | undefined;
  reset: () => AbortController;
  abort: () => void;
}

/**
 * A reusable hook for managing AbortController lifecycle.
 * Automatically aborts on component unmount to prevent memory leaks.
 *
 * @example
 * ```tsx
 * const { signal, reset, abort } = useAbortController();
 *
 * const handleFetch = async () => {
 *   const controller = reset(); // Creates new controller, aborts previous
 *   try {
 *     const response = await fetch('/api/data', { signal: controller.signal });
 *     // handle response
 *   } catch (error) {
 *     if (error instanceof Error && error.name === 'AbortError') {
 *       return; // Request was cancelled, ignore
 *     }
 *     throw error;
 *   }
 * };
 * ```
 */
export function useAbortController(): UseAbortControllerReturn {
  const controllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current;
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return {
    get signal() {
      return controllerRef.current?.signal;
    },
    reset,
    abort,
  };
}

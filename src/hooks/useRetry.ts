'use client';

import { useCallback, useRef, useEffect } from 'react';

/**
 * Options for configuring retry behavior
 */
export interface UseRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Exponential base for backoff calculation (default: 2) */
  exponentialBase?: number;
  /** Whether to add jitter (0-30%) to prevent thundering herd (default: true) */
  jitter?: boolean;
}

/**
 * Callback invoked between retry attempts
 */
export type OnRetryCallback = (retryNumber: number, delayMs: number) => void;

/**
 * Return type for the retry executor function
 */
export type RetryExecutor = <T>(
  operation: () => Promise<T>,
  onRetry?: OnRetryCallback
) => Promise<T>;

/**
 * useRetry -- Exponential backoff retry hook
 *
 * Provides a retry function for async operations with exponential backoff
 * and optional jitter to prevent thundering herd problems.
 *
 * Backoff formula: baseDelay * exponentialBase^(attempt-1) + jitter
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const retry = useRetry({ maxRetries: 3, baseDelay: 1000 });
 *
 *   const handleFetch = async () => {
 *     try {
 *       const result = await retry(
 *         () => fetch('/api/data').then(r => r.json()),
 *         (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`)
 *       );
 *       setData(result);
 *     } catch (error) {
 *       console.error('All retries failed:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleFetch}>Fetch Data</button>;
 * }
 * ```
 */
export function useRetry(options: UseRetryOptions = {}): RetryExecutor {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    exponentialBase = 2,
    jitter = true,
  } = options;

  // Track if component is mounted (prevent state updates after unmount)
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sleep = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const exponentialDelay = baseDelay * Math.pow(exponentialBase, attempt - 1);

      if (!jitter) {
        return Math.floor(exponentialDelay);
      }

      // Add 0-30% jitter to prevent thundering herd
      const jitterFactor = Math.random() * 0.3;
      const jitterAmount = exponentialDelay * jitterFactor;

      return Math.floor(exponentialDelay + jitterAmount);
    },
    [baseDelay, exponentialBase, jitter]
  );

  const executeWithRetry: RetryExecutor = useCallback(
    async <T>(
      operation: () => Promise<T>,
      onRetry?: OnRetryCallback
    ): Promise<T> => {
      let lastError: Error | null = null;

      for (let attemptNumber = 1; attemptNumber <= maxRetries + 1; attemptNumber++) {
        try {
          const result = await operation();
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          if (attemptNumber <= maxRetries) {
            const retryNumber = attemptNumber;
            const delay = calculateDelay(retryNumber);

            if (onRetry && mountedRef.current) {
              onRetry(retryNumber, delay);
            }

            await sleep(delay);
          }
        }
      }

      throw lastError || new Error(`Operation failed after ${maxRetries} retries`);
    },
    [maxRetries, calculateDelay, sleep]
  );

  return executeWithRetry;
}

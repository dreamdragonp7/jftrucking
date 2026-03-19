import { useRef, useCallback } from "react";

export interface Coordinates {
  x: number;
  y: number;
}

export interface UseLongPressOptions {
  /** Callback fired when long-press completes */
  onLongPress?: (coords: Coordinates) => void;
  /** Delay before long-press fires (milliseconds). Default: 600 */
  delay?: number;
  /** Called when pointer is pressed (before delay completes) */
  onStart?: () => void;
  /** Called when long-press is cancelled */
  onCancel?: () => void;
}

export interface LongPressHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Hook for detecting long-press gestures.
 * Works with both mouse and touch via PointerEvents.
 */
export function useLongPress(options: UseLongPressOptions): LongPressHandlers {
  const { onLongPress, delay = 600, onStart, onCancel } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordsRef = useRef<Coordinates | null>(null);
  const longPressFiredRef = useRef(false);
  const pointerCapturedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!onLongPress) return;

      e.currentTarget.setPointerCapture(e.pointerId);
      pointerCapturedRef.current = true;

      const rect = e.currentTarget.getBoundingClientRect();
      const coords: Coordinates = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      coordsRef.current = coords;
      longPressFiredRef.current = false;

      onStart?.();

      timerRef.current = setTimeout(() => {
        if (coordsRef.current && onLongPress) {
          longPressFiredRef.current = true;
          onLongPress(coordsRef.current);
        }
      }, delay);
    },
    [onLongPress, delay, onStart]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (pointerCapturedRef.current) {
        e.currentTarget.releasePointerCapture(e.pointerId);
        pointerCapturedRef.current = false;
      }

      if (timerRef.current && !longPressFiredRef.current) {
        clearTimer();
        onCancel?.();
      }

      clearTimer();
      coordsRef.current = null;
      longPressFiredRef.current = false;
    },
    [clearTimer, onCancel]
  );

  const handlePointerLeave = useCallback(
    (_e: React.PointerEvent<HTMLElement>) => {
      if (timerRef.current && !longPressFiredRef.current) {
        clearTimer();
        onCancel?.();
      }
    },
    [clearTimer, onCancel]
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
  };
}

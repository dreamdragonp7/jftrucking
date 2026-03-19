/**
 * Gesture utilities for touch and swipe detection.
 * Provides cross-platform gesture handling with iOS-specific considerations.
 */

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

export interface SwipeGesture {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
}

const SWIPE_THRESHOLD = 30;
const VELOCITY_THRESHOLD = 0.3;

/**
 * Detects a swipe gesture from touch start and end coordinates.
 */
export function detectSwipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number
): SwipeGesture {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const velocity = duration > 0 ? distance / duration : 0;

  if (distance < SWIPE_THRESHOLD || velocity < VELOCITY_THRESHOLD) {
    return { direction: null, distance, velocity };
  }

  let direction: SwipeDirection;
  if (absX >= absY) {
    direction = deltaX > 0 ? "right" : "left";
  } else {
    direction = deltaY > 0 ? "down" : "up";
  }

  return { direction, distance, velocity };
}

/**
 * Prevents the iOS rubber band scroll bounce effect on an element.
 * Returns a cleanup function to remove event listeners.
 */
export function preventIOSScrollBounce(element: HTMLElement): () => void {
  let startY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    startY = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    if (scrollTop <= 0 && currentY > startY) {
      e.preventDefault();
    }
    if (scrollTop + clientHeight >= scrollHeight && currentY < startY) {
      e.preventDefault();
    }
  };

  element.addEventListener("touchstart", handleTouchStart, { passive: true });
  element.addEventListener("touchmove", handleTouchMove, { passive: false });

  return () => {
    element.removeEventListener("touchstart", handleTouchStart);
    element.removeEventListener("touchmove", handleTouchMove);
  };
}

/**
 * Checks if a touch started near the edge of the screen.
 * iOS considers touches within ~20px of the edge as potential back gestures.
 */
export function isTouchNearEdge(
  touchX: number,
  edgeThreshold: number = 20
): boolean {
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  return touchX <= edgeThreshold || touchX >= screenWidth - edgeThreshold;
}

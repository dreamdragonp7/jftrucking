'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Options for the useFocusTrap hook
 */
interface UseFocusTrapOptions {
  /** Whether the focus trap is enabled (default: true) */
  enabled?: boolean;
  /** Element to focus initially when trap activates */
  initialFocus?: RefObject<HTMLElement>;
  /** Return focus to previously focused element on cleanup (default: true) */
  returnFocus?: boolean;
}

// Selector for all focusable elements
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Gets all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  return Array.from(elements).filter((el) => {
    // Ensure the element is visible
    return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  });
}

/**
 * Custom hook that traps focus within a container element.
 * Cycles focus within container on Tab/Shift+Tab.
 * Stores and optionally restores focus to previous element.
 *
 * @param containerRef - Ref to the container element
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(modalRef, { enabled: isOpen });
 *
 *   return isOpen ? (
 *     <div ref={modalRef} role="dialog">
 *       <button onClick={onClose}>Close</button>
 *       <input placeholder="Name" />
 *     </div>
 *   ) : null;
 * }
 * ```
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions = {}
): void {
  const { enabled = true, initialFocus, returnFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the initial element or the first focusable element
    const focusableElements = getFocusableElements(container);
    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      // Make the container focusable and focus it
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    // Handle Tab key for focus cycling
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') {
        return;
      }

      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const currentFocusableElements = getFocusableElements(currentContainer);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // Shift+Tab: cycle backwards
        if (activeElement === firstElement || !currentContainer.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: cycle forwards
        if (activeElement === lastElement || !currentContainer.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    // Prevent focus from escaping the container
    function handleFocusOut(event: FocusEvent) {
      const currentContainer = containerRef.current;
      if (!currentContainer) {
        return;
      }

      const relatedTarget = event.relatedTarget as HTMLElement | null;

      // If focus is moving outside the container, bring it back
      if (relatedTarget && !currentContainer.contains(relatedTarget)) {
        const currentFocusableElements = getFocusableElements(currentContainer);
        if (currentFocusableElements.length > 0) {
          currentFocusableElements[0].focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focusout', handleFocusOut);

      // Return focus to the previously focused element
      if (returnFocus && previousFocusRef.current) {
        // Use requestAnimationFrame to ensure the element is still in the DOM
        requestAnimationFrame(() => {
          if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
            previousFocusRef.current.focus();
          }
        });
      }
    };
  }, [enabled, containerRef, initialFocus, returnFocus]);
}

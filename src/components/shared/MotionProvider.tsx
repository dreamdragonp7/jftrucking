"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps children with Framer Motion's MotionConfig to respect
 * the user's OS-level prefers-reduced-motion setting globally.
 *
 * When reducedMotion="user", Framer Motion checks the
 * `prefers-reduced-motion` media query and disables animations
 * for users who have opted out.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

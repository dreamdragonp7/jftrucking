/**
 * Shared typed result for all Server Actions.
 * Every action returns { success, data?, error? } so the client
 * always knows what happened.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Helper to create success result.
 */
export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Helper to create error result from unknown error.
 */
export function fail(error: unknown): ActionResult<never> {
  console.error("[ActionResult] Server action failed:", error);
  return {
    success: false,
    error: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

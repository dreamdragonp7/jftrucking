import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * className Merge Utility
 *
 * Combines Tailwind classes with proper deduplication.
 * Standard shadcn/ui pattern.
 *
 * @example
 * cn("px-4 py-2", "px-6") // "px-6 py-2"
 * cn("text-red-500", condition && "text-green-500") // conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

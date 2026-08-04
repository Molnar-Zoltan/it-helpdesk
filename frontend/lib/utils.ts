import { clsx, type ClassValue } from "clsx";

/**
 * Merge conditional class names. We don't pull in tailwind-merge on top of
 * clsx — this app's utility usage is simple enough (no repeated conflicting
 * utilities like `p-2 ... p-4` across variants) that clsx alone is enough,
 * and it keeps the dependency list smaller.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

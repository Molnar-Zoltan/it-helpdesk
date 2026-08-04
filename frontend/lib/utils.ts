import { clsx, type ClassValue } from "clsx";
import type { Role } from "@helpdesk/shared";

/**
 * Merge conditional class names. We don't pull in tailwind-merge on top of
 * clsx — this app's utility usage is simple enough (no repeated conflicting
 * utilities like `p-2 ... p-4` across variants) that clsx alone is enough,
 * and it keeps the dependency list smaller.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Customer",
  AGENT: "Agent",
  ADMIN: "Admin",
};

/** Display label for a Role enum value, e.g. "AGENT" -> "Agent". */
export function formatRole(role: Role) {
  return ROLE_LABELS[role];
}

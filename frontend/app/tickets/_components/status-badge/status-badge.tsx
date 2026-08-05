import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import type { StatusBadgeProps } from "./status-badge.types";

/**
 * Tone reads as a rough progression through Badge's fixed four-color
 * palette: OPEN (nothing done yet) gets the loudest tone, IN_PROGRESS the
 * "active" amber Tabs/Badge already use for in-motion states, RESOLVED the
 * "done" teal, and CLOSED fades to neutral gray once there's nothing left
 * to act on.
 */
const STATUS_LABELS: Record<StatusBadgeProps["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_TONES: Record<StatusBadgeProps["status"], BadgeTone> = {
  OPEN: "danger",
  IN_PROGRESS: "active",
  RESOLVED: "done",
  CLOSED: "neutral",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

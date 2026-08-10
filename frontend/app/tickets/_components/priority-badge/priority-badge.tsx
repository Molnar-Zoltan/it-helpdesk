import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { TICKET_PRIORITY_LABELS } from "@/lib/constants/text/tickets.text";
import type { PriorityBadgeProps } from "./priority-badge.types";

/**
 * Only HIGH/URGENT get a tone that stands out (amber/red) -- LOW and
 * MEDIUM share neutral gray, since the point is drawing the eye to
 * priorities that need it, not giving every level a unique color for its
 * own sake.
 */
const PRIORITY_TONES: Record<PriorityBadgeProps["priority"], BadgeTone> = {
  LOW: "neutral",
  MEDIUM: "neutral",
  HIGH: "active",
  URGENT: "danger",
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <Badge tone={PRIORITY_TONES[priority]}>{TICKET_PRIORITY_LABELS[priority]}</Badge>;
}

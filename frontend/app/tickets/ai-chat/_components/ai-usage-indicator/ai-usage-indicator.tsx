import { Badge } from "@/components/ui/badge";
import { AI_USAGE_INDICATOR_TEXT } from "@/lib/constants/text/tickets.text";
import type { AiUsageIndicatorProps } from "./ai-usage-indicator.types";

/**
 * "X of Y used today" (Step 10.6.3), backed by GET /ai/usage. `danger`
 * tone once the limit is hit -- the composer disables itself at the same
 * threshold (see AiChatPanel's usageLimitReached) -- neutral otherwise,
 * same tone-by-state pattern StatusBadge/PriorityBadge already use rather
 * than a single fixed color regardless of how close to the cap the user is.
 */
export function AiUsageIndicator({ used, limit }: AiUsageIndicatorProps) {
  const isAtLimit = used >= limit;
  return (
    <Badge tone={isAtLimit ? "danger" : "neutral"}>
      {AI_USAGE_INDICATOR_TEXT.usedToday(used, limit)}
    </Badge>
  );
}

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MESSAGE_ITEM_TEXT } from "@/lib/constants/text/tickets.text";
import type { MessageItemProps } from "./message-item.types";

/** Date + time, unlike lib/utils.ts's formatDate (date-only, built for the
 * ticket list) -- a conversation thread benefits from time-of-day, and this
 * is the only place that needs it so far. */
function formatMessageTimestamp(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * senderId is the only identity signal a Message carries (see
 * lib/api/types.ts's MessageResponse) -- there's no embedded sender name.
 * "You" vs "Support" is a fair simplification today since this page is
 * only reachable by a ticket's owning customer; a null senderId (the
 * original sender's account was later deleted) also falls into "Support"
 * rather than claiming to be the viewer.
 */
function senderLabel(isOwnMessage: boolean, isAiGenerated: boolean) {
  if (isAiGenerated) return MESSAGE_ITEM_TEXT.AI_SENDER_LABEL;
  return isOwnMessage ? MESSAGE_ITEM_TEXT.YOU_SENDER_LABEL : MESSAGE_ITEM_TEXT.SUPPORT_SENDER_LABEL;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  return (
    <div className={cn("flex flex-col gap-1", isOwnMessage ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">
          {senderLabel(isOwnMessage, message.isAiGenerated)}
        </span>
        {message.isAiGenerated && <Badge tone="active">{MESSAGE_ITEM_TEXT.AI_BADGE}</Badge>}
        <span>{formatMessageTimestamp(message.createdAt)}</span>
      </div>

      <div
        className={cn(
          "max-w-[85%] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap",
          isOwnMessage
            ? "border-accent-done/30 bg-accent-done/10 text-text"
            : "border-border bg-surface-raised text-text",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

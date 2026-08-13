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
 * senderName (the sender's real name at read time, joined server-side —
 * see TicketsService.toMessageResponse) is what actually identifies who
 * sent a message that isn't the viewer's own. The old "You"-vs-"Support"
 * split assumed this page was only ever reachable by the ticket's owning
 * customer, so anyone else must be "Support" — that stopped holding once
 * Step 9.4 opened the thread to agents/admins too, and an agent viewing a
 * customer's message was getting mislabeled "Support". Falls back to the
 * old generic label only when senderName is null: either AI-generated
 * (never had a sender), or the original sender's account was later
 * deleted (GDPR anonymization — see schema.md), where the name is
 * genuinely gone, not just unfetched.
 */
function senderLabel(
  message: MessageItemProps["message"],
  isOwnMessage: boolean,
) {
  if (message.isAiGenerated) return MESSAGE_ITEM_TEXT.AI_SENDER_LABEL;
  if (isOwnMessage) return MESSAGE_ITEM_TEXT.YOU_SENDER_LABEL;
  return message.senderName ?? MESSAGE_ITEM_TEXT.SUPPORT_SENDER_LABEL;
}

export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isOwnMessage ? "items-end" : "items-start",
      )}
    >
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span className="font-medium text-text-secondary">
          {senderLabel(message, isOwnMessage)}
        </span>
        {message.isAiGenerated && (
          <Badge tone="active">{MESSAGE_ITEM_TEXT.AI_BADGE}</Badge>
        )}
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

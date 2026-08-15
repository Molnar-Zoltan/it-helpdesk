import { cn } from "@/lib/utils";
import { AI_CHAT_MESSAGE_TEXT } from "@/lib/constants/text/tickets.text";
import type { AiChatMessageProps } from "./ai-chat-message.types";

/**
 * Renders one turn of the transcript AiChatPanel holds in memory (Step
 * 10.4 -- this is never itself a persisted Message row; those only exist
 * once create_ticket fires, and the ticket detail page's own MessageItem
 * renders them afterward, not this component). Visual language mirrors
 * MessageItem's bubble styling (accent-tinted + right-aligned for the
 * user, neutral + left-aligned for the model) so the chat doesn't read
 * as a different app from the ticket thread it may end up feeding.
 */
export function AiChatMessage({ role, content }: AiChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      <span className="text-xs font-medium text-text-secondary">
        {isUser
          ? AI_CHAT_MESSAGE_TEXT.YOU_LABEL
          : AI_CHAT_MESSAGE_TEXT.ASSISTANT_LABEL}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "border-accent-done/30 bg-accent-done/10 text-text"
            : "border-border bg-surface-raised text-text",
        )}
      >
        {content}
      </div>
    </div>
  );
}

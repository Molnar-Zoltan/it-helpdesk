"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { X } from "lucide-react";
import { AI_CHAT_ROLES, AI_CHAT_MAX_TRANSCRIPT_MESSAGES, API_ERROR_CODES } from "@helpdesk/shared";
import type { AiChatRole } from "@helpdesk/shared";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { useAiChat } from "@/lib/mutations/use-ai-chat";
import { useAiUsage } from "@/lib/queries/use-ai-usage";
import { useRateLimitCountdown, formatCountdown } from "@/lib/hooks/use-rate-limit-countdown";
import { ROUTES } from "@/lib/constants/routes.constants";
import { AI_ASSISTANT_TEXT, AI_ASSISTANT_COMPOSER_TEXT } from "@/lib/constants/text/ai-assistant.text";
import { AiAssistantMessage } from "../ai-assistant-message";
import { AiAssistantComposer } from "../ai-assistant-composer";
import { AiUsageIndicator } from "../ai-usage-indicator";

interface TranscriptEntry {
  id: string;
  role: AiChatRole;
  content: string;
}

interface AiAssistantWindowProps {
  onClose: () => void;
}

/**
 * The open state of the widget -- everything AiChatPanel used to own
 * (Step 10.6's original full-page version), now inside a fixed
 * bottom-right window instead of a page. Mounted for the lifetime of the
 * root layout, so the transcript survives client-side navigation between
 * pages, same as a real Messenger window would; it only resets on a hard
 * reload (Step 10.4's backend is stateless either way, so nothing is
 * actually lost server-side by that).
 */
export function AiAssistantWindow({ onClose }: AiAssistantWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const chatMutation = useAiChat();
  const usageQuery = useAiUsage();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Keeps the newest turn in view, same behavior a real messaging window
  // has -- re-runs on every new message and while a reply is pending (the
  // isSending state on AiAssistantComposer briefly grows the footer).
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, chatMutation.isPending]);

  // Same 429-countdown pattern NewTicketForm uses for
  // TICKET_CREATE_RATE_LIMITED, keyed on AI_DAILY_LIMIT_EXCEEDED instead --
  // AiDailyLimitExceededException's retryAfterSeconds comes off the Redis
  // key's real TTL (see backend/src/ai/guards/), so this is accurate to
  // the second, not a guess.
  const cooldownRemaining = useRateLimitCountdown(
    chatMutation.isError,
    chatMutation.error,
    API_ERROR_CODES.AI_DAILY_LIMIT_EXCEEDED,
  );
  const isOnCooldown = cooldownRemaining !== null && cooldownRemaining > 0;

  // Once the cooldown above expires, isOnCooldown flips to false but
  // chatMutation.error is still the stale 429 until the next attempt --
  // suppress it specifically rather than rendering it as a generic error
  // forever (same reasoning as NewTicketForm's isRateLimitError).
  const isRateLimitError =
    chatMutation.isError &&
    chatMutation.error instanceof ApiError &&
    chatMutation.error.code === API_ERROR_CODES.AI_DAILY_LIMIT_EXCEEDED;

  // GET /ai/usage's own count catches "already at today's limit from an
  // earlier session" before the user types a single word -- the
  // mutation's own 429 alone can't do that, since it only exists after a
  // request has actually been rejected.
  const usageLimitReached =
    usageQuery.data !== undefined && usageQuery.data.used >= usageQuery.data.limit;

  // AiChatMessageDto's transcript array is capped server-side
  // (ArrayMaxSize(AI_CHAT_MAX_TRANSCRIPT_MESSAGES)); stopping the
  // composer here avoids sending a turn that's guaranteed to 400 once
  // the cap is hit, in favor of a clear "start a manual ticket" nudge.
  const transcriptLimitReached = messages.length >= AI_CHAT_MAX_TRANSCRIPT_MESSAGES;

  const composerDisabled =
    isOnCooldown || usageLimitReached || transcriptLimitReached || chatMutation.isPending;

  const showManualFallback =
    isOnCooldown ||
    usageLimitReached ||
    transcriptLimitReached ||
    (chatMutation.isError && !isRateLimitError);

  const handleSend = async (content: string) => {
    const userEntry: TranscriptEntry = {
      id: crypto.randomUUID(),
      role: AI_CHAT_ROLES.USER,
      content,
    };
    // Sent as part of nextMessages below regardless of what happens next
    // -- Step 10.4's stateless contract means every call resends the
    // full history, so appending here (rather than waiting on the
    // response) is what lets a failed attempt's text survive to be
    // resent on the next try instead of being lost.
    const nextMessages = [...messages, userEntry];
    setMessages(nextMessages);

    try {
      const response = await chatMutation.mutateAsync({
        messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
      });

      if (response.type === "ticket_created") {
        toast.success(AI_ASSISTANT_TEXT.TICKET_CREATED_TOAST);
        onClose();
        router.push(ROUTES.ticketDetail(response.ticket.id));
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: AI_CHAT_ROLES.MODEL, content: response.content },
      ]);
    } catch {
      // Surfaced below via chatMutation.error. The user's message stays
      // in the transcript (nothing typed is lost) and gets resent as
      // part of history on the next attempt.
    }
  };

  return (
    <div className="fixed right-5 bottom-5 z-50 flex h-[32rem] max-h-[calc(100vh-2.5rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-surface-raised px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-text">{AI_ASSISTANT_TEXT.TITLE}</span>
          {usageQuery.data && (
            <AiUsageIndicator used={usageQuery.data.used} limit={usageQuery.data.limit} />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={AI_ASSISTANT_TEXT.CLOSE_ARIA_LABEL}
          className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* AI_ASSISTANT_TEXT.GREETING is a plain constant, not a real
            "model" turn -- it's never part of `messages`, so it never
            gets sent to POST /ai/chat as part of the transcript. */}
        <AiAssistantMessage role={AI_CHAT_ROLES.MODEL} content={AI_ASSISTANT_TEXT.GREETING} />

        {messages.map((message) => (
          <AiAssistantMessage key={message.id} role={message.role} content={message.content} />
        ))}

        <div ref={scrollAnchorRef} />
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
        {isOnCooldown ? (
          <Alert tone="danger">
            {AI_ASSISTANT_COMPOSER_TEXT.rateLimitedMessage(formatCountdown(cooldownRemaining))}
          </Alert>
        ) : transcriptLimitReached ? (
          <Alert tone="danger">{AI_ASSISTANT_COMPOSER_TEXT.CONVERSATION_LIMIT_REACHED}</Alert>
        ) : usageLimitReached ? (
          <Alert tone="danger">{AI_ASSISTANT_COMPOSER_TEXT.LIMIT_REACHED}</Alert>
        ) : (
          chatMutation.isError &&
          !isRateLimitError && <Alert tone="danger">{chatMutation.error.message}</Alert>
        )}

        {showManualFallback && (
          <Link
            href={ROUTES.NEW_TICKET}
            className="text-xs font-medium text-accent-done hover:underline"
          >
            {AI_ASSISTANT_TEXT.MANUAL_FALLBACK_LINK}
          </Link>
        )}

        <AiAssistantComposer
          onSend={handleSend}
          disabled={composerDisabled}
          isSending={chatMutation.isPending}
        />
      </div>
    </div>
  );
}

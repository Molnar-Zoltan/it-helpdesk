"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AI_CHAT_ROLES,
  AI_CHAT_MAX_TRANSCRIPT_MESSAGES,
  API_ERROR_CODES,
} from "@helpdesk/shared";
import type { AiChatRole } from "@helpdesk/shared";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { useAiChat } from "@/lib/mutations/use-ai-chat";
import { useAiUsage } from "@/lib/queries/use-ai-usage";
import {
  useRateLimitCountdown,
  formatCountdown,
} from "@/lib/hooks/use-rate-limit-countdown";
import { ROUTES } from "@/lib/constants/routes.constants";
import {
  AI_CHAT_TEXT,
  AI_CHAT_COMPOSER_TEXT,
} from "@/lib/constants/text/tickets.text";
import { AiChatMessage } from "../ai-chat-message";
import { AiChatComposer } from "../ai-chat-composer";
import { AiUsageIndicator } from "../ai-usage-indicator";

interface TranscriptEntry {
  id: string;
  role: AiChatRole;
  content: string;
}

/**
 * Owns the whole chat interaction: the in-memory transcript (Step 10.4 --
 * the backend is stateless, so this component itself is the only place
 * conversation state lives, and it's gone on refresh/navigation by
 * design, same as an abandoned manual-form draft), the POST /ai/chat
 * mutation, and the redirect to the new ticket once create_ticket fires.
 */
export function AiChatPanel() {
  const router = useRouter();
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const chatMutation = useAiChat();
  const usageQuery = useAiUsage();

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
    usageQuery.data !== undefined &&
    usageQuery.data.used >= usageQuery.data.limit;

  // AiChatMessageDto's transcript array is capped server-side
  // (ArrayMaxSize(AI_CHAT_MAX_TRANSCRIPT_MESSAGES)); stopping the
  // composer here avoids sending a turn that's guaranteed to 400 once the
  // cap is hit, in favor of a clear "start a manual ticket" nudge instead.
  const transcriptLimitReached =
    messages.length >= AI_CHAT_MAX_TRANSCRIPT_MESSAGES;

  const composerDisabled =
    isOnCooldown ||
    usageLimitReached ||
    transcriptLimitReached ||
    chatMutation.isPending;

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
        messages: nextMessages.map(({ role, content: text }) => ({
          role,
          content: text,
        })),
      });

      if (response.type === "ticket_created") {
        toast.success(AI_CHAT_TEXT.TICKET_CREATED_TOAST);
        router.push(ROUTES.ticketDetail(response.ticket.id));
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: AI_CHAT_ROLES.MODEL,
          content: response.content,
        },
      ]);
    } catch {
      // Surfaced below via chatMutation.error. The user's message stays
      // in the transcript (nothing typed is lost) and gets resent as
      // part of history on the next attempt.
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">{AI_CHAT_TEXT.INTRO}</p>
        {usageQuery.data && (
          <AiUsageIndicator
            used={usageQuery.data.used}
            limit={usageQuery.data.limit}
          />
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex flex-col gap-4 rounded-md border border-border-strong bg-bg/40 p-4">
          {messages.map((message) => (
            <AiChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
            />
          ))}
        </div>
      )}

      {isOnCooldown ? (
        <Alert tone="danger">
          {AI_CHAT_COMPOSER_TEXT.rateLimitedMessage(
            formatCountdown(cooldownRemaining),
          )}
        </Alert>
      ) : transcriptLimitReached ? (
        <Alert tone="danger">
          {AI_CHAT_COMPOSER_TEXT.CONVERSATION_LIMIT_REACHED}
        </Alert>
      ) : usageLimitReached ? (
        <Alert tone="danger">{AI_CHAT_COMPOSER_TEXT.LIMIT_REACHED}</Alert>
      ) : (
        chatMutation.isError &&
        !isRateLimitError && (
          <Alert tone="danger">{chatMutation.error.message}</Alert>
        )
      )}

      {showManualFallback && (
        <Link
          href={ROUTES.NEW_TICKET}
          className="self-start text-sm font-medium text-accent-done hover:underline"
        >
          {AI_CHAT_TEXT.MANUAL_FALLBACK_LINK}
        </Link>
      )}

      <AiChatComposer
        onSend={handleSend}
        disabled={composerDisabled}
        isSending={chatMutation.isPending}
      />
    </div>
  );
}

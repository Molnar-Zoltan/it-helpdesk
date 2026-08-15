"use client";

import { useState } from "react";
import { useProfile } from "@/lib/queries/use-profile";
import { useAiAssistant } from "@/lib/context/ai-assistant-context";
import { AiAssistantLauncher } from "./_components/ai-assistant-launcher";
import { AiAssistantWindow } from "./_components/ai-assistant-window";
import type { TranscriptEntry } from "./ai-assistant-widget.types";

/**
 * Mounted once in the root layout (see app/layout.tsx), inside both
 * QueryClientProvider and AiAssistantProvider, so it's present on every
 * page for the lifetime of the app shell -- a Messenger-style persistent
 * widget, not a per-page component.
 *
 * Role gate mirrors NewTicketView/TicketQueueView's own client-side
 * check: POST /ai/chat and GET /ai/usage are both @Roles(CUSTOMER)
 * server-side already, so this is UX (don't show a chat bubble an
 * AGENT/ADMIN account, or a logged-out visitor, can't actually use),
 * not the real boundary. Renders nothing while the profile is loading,
 * to avoid a flash of the bubble for a visitor who then turns out to be
 * logged out.
 *
 * The transcript lives here, not inside AiAssistantWindow -- this
 * component stays mounted for the whole session, but AiAssistantWindow
 * itself unmounts every time the widget is collapsed to the launcher
 * bubble. Owning `messages` at this level is what lets closing and
 * reopening the widget keep the conversation, the same way a real
 * Messenger window would; a full page reload still clears it, since
 * nothing here is written to any storage.
 */
export function AiAssistantWidget() {
  const { data: profile, isLoading } = useProfile();
  const { isOpen, open, close } = useAiAssistant();
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);

  if (isLoading || profile?.role !== "CUSTOMER") {
    return null;
  }

  return isOpen ? (
    <AiAssistantWindow onClose={close} messages={messages} onMessagesChange={setMessages} />
  ) : (
    <AiAssistantLauncher onOpen={open} />
  );
}

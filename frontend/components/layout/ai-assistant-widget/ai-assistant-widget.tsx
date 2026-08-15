"use client";

import { useProfile } from "@/lib/queries/use-profile";
import { useAiAssistant } from "@/lib/context/ai-assistant-context";
import { AiAssistantLauncher } from "./_components/ai-assistant-launcher";
import { AiAssistantWindow } from "./_components/ai-assistant-window";

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
 */
export function AiAssistantWidget() {
  const { data: profile, isLoading } = useProfile();
  const { isOpen, open, close } = useAiAssistant();

  if (isLoading || profile?.role !== "CUSTOMER") {
    return null;
  }

  return isOpen ? <AiAssistantWindow onClose={close} /> : <AiAssistantLauncher onOpen={open} />;
}

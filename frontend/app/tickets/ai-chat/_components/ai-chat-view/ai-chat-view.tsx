"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useProfile } from "@/lib/queries/use-profile";
import { ROUTES } from "@/lib/constants/routes.constants";
import {
  AI_CHAT_TEXT,
  TICKET_LIST_TEXT,
} from "@/lib/constants/text/tickets.text";
import { AiChatPanel } from "../ai-chat-panel";

/**
 * Same client-side role check NewTicketView/TicketQueueView already use --
 * filing a ticket (manually or via chat) is a customer action, not
 * something an AGENT/ADMIN account does for itself. POST /ai/chat and
 * GET /ai/usage are both @Roles(CUSTOMER)-gated server-side already, so
 * this is UX (a clear redirect instead of a raw 403), not the real
 * boundary -- same split as NewTicketView's own comment on this.
 */
export function AiChatView() {
  const { data: profile, isLoading } = useProfile();
  const isAgentOrAdmin = profile?.role === "AGENT" || profile?.role === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={AI_CHAT_TEXT.HEADING} />
      </div>
    );
  }

  if (isAgentOrAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-text-secondary">{TICKET_LIST_TEXT.NOT_AVAILABLE}</p>
        <Link
          href={ROUTES.TICKET_QUEUE}
          className="text-sm font-medium text-accent-done hover:underline"
        >
          {TICKET_LIST_TEXT.GO_TO_QUEUE}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">
          {AI_CHAT_TEXT.HEADING}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {AI_CHAT_TEXT.SUBHEADING}
        </p>
      </div>

      <Card>
        <AiChatPanel />
      </Card>
    </div>
  );
}

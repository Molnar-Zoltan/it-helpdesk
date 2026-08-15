"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useProfile } from "@/lib/queries/use-profile";
import { useAiAssistant } from "@/lib/context/ai-assistant-context";
import { ROUTES } from "@/lib/constants/routes.constants";
import { NEW_TICKET_TEXT, TICKET_LIST_TEXT } from "@/lib/constants/text/tickets.text";
import { NewTicketForm } from "../new-ticket-form";

/**
 * Same client-side role check as TicketQueueView, just the opposite
 * direction — filing a ticket is a customer action, not something an
 * AGENT/ADMIN account does for itself (Step 9.6.3; POST /tickets is now
 * also CUSTOMER-only server-side, so this is UX, not the real boundary).
 */
export function NewTicketView() {
  const { data: profile, isLoading } = useProfile();
  const { open: openAiAssistant } = useAiAssistant();
  const isAgentOrAdmin = profile?.role === "AGENT" || profile?.role === "ADMIN";

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label={NEW_TICKET_TEXT.HEADING} />
      </div>
    );
  }

  if (isAgentOrAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-text-secondary">{TICKET_LIST_TEXT.NOT_AVAILABLE}</p>
        <Link href={ROUTES.TICKET_QUEUE} className="text-sm font-medium text-accent-done hover:underline">
          {TICKET_LIST_TEXT.GO_TO_QUEUE}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{NEW_TICKET_TEXT.HEADING}</h1>
        <p className="mt-1 text-sm text-text-secondary">{NEW_TICKET_TEXT.SUBHEADING}</p>
      </div>

      <Card>
        <NewTicketForm />
      </Card>

      <button
        type="button"
        onClick={openAiAssistant}
        className="cursor-pointer self-start text-sm font-medium text-accent-done hover:underline"
      >
        {NEW_TICKET_TEXT.AI_CHAT_LINK}
      </button>
    </div>
  );
}

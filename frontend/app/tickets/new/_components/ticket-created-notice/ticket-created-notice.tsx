import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { TicketResponse } from "@/lib/api/types";

interface TicketCreatedNoticeProps {
  ticket: TicketResponse;
  onCreateAnother: () => void;
}

/**
 * Neither /tickets (list, Step 5.6) nor /tickets/[id] (detail, Step 5.7)
 * exist yet, so there's nowhere real to redirect to on success. This
 * inline confirmation stands in until 5.7 lands — swap it for a redirect
 * to /tickets/[id] once that route exists.
 */
export function TicketCreatedNotice({ ticket, onCreateAnother }: TicketCreatedNoticeProps) {
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="done">
        Ticket created: <span className="font-medium">{ticket.title}</span>
      </Alert>
      <p className="text-sm text-text-secondary">
        We&apos;ve logged your ticket. You&apos;ll be able to track its progress here once the
        ticket list is live.
      </p>
      <Button variant="secondary" onClick={onCreateAnother} className="self-start">
        Create another ticket
      </Button>
    </div>
  );
}

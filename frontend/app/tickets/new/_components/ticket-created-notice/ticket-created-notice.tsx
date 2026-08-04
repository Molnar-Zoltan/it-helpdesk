import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { TicketResponse } from "@/lib/api/types";

interface TicketCreatedNoticeProps {
  ticket: TicketResponse;
  onCreateAnother: () => void;
}

/**
 * /tickets/[id] (detail, Step 5.7) still doesn't exist, so there's nowhere
 * to redirect straight to the new ticket yet. /tickets (list, Step 5.6)
 * does now, though, so this links there instead of the old "once the
 * ticket list is live" placeholder copy. Swap the whole notice for a
 * redirect to /tickets/[id] once that route lands.
 */
export function TicketCreatedNotice({ ticket, onCreateAnother }: TicketCreatedNoticeProps) {
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="done">
        Ticket created: <span className="font-medium">{ticket.title}</span>
      </Alert>
      <p className="text-sm text-text-secondary">
        We&apos;ve logged your ticket. You can track it from your ticket list.
      </p>
      <div className="flex gap-3">
        <Link
          href="/tickets"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-done px-4 py-2 text-sm font-medium text-bg transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-done"
        >
          View my tickets
        </Link>
        <Button variant="secondary" onClick={onCreateAnother}>
          Create another ticket
        </Button>
      </div>
    </div>
  );
}

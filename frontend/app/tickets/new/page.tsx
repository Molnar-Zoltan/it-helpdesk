import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { NewTicketForm } from "./_components/new-ticket-form";
import { NEW_TICKET_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: NEW_TICKET_TEXT.META_TITLE,
};

export default function NewTicketPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">{NEW_TICKET_TEXT.HEADING}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {NEW_TICKET_TEXT.SUBHEADING}
        </p>
      </div>

      <Card>
        <NewTicketForm />
      </Card>
    </div>
  );
}

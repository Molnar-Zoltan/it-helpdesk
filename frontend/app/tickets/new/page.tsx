import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { NewTicketForm } from "./_components/new-ticket-form";

export const metadata: Metadata = {
  title: "New ticket — IT Helpdesk",
};

export default function NewTicketPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">New ticket</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Describe the issue and we&apos;ll get it to the right person.
        </p>
      </div>

      <Card>
        <NewTicketForm />
      </Card>
    </div>
  );
}

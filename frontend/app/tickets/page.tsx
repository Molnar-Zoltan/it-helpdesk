import { Suspense } from "react";
import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";
import { TicketListView } from "./_components/ticket-list-view";

export const metadata: Metadata = {
  title: "My tickets — IT Helpdesk",
};

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner label="Loading tickets" />
        </div>
      }
    >
      <TicketListView />
    </Suspense>
  );
}

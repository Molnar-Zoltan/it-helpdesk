import type { Metadata } from "next";
import { TicketListView } from "./_components/ticket-list-view";

export const metadata: Metadata = {
  title: "My tickets — IT Helpdesk",
};

export default function TicketsPage() {
  return <TicketListView />;
}

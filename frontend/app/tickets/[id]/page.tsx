import type { Metadata } from "next";
import { TicketDetailView } from "./_components/ticket-detail-view";

export const metadata: Metadata = {
  title: "Ticket — IT Helpdesk",
};

// Next 16: dynamic route `params` is a Promise, must be awaited before use
// (a real breaking change from older Next knowledge, same one already
// noted for proxy.ts/middleware.ts in Step 5.3's architecture notes).
interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <TicketDetailView ticketId={id} />
    </div>
  );
}

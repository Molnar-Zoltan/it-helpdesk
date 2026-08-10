"use client";

import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { useTicketMessages } from "@/lib/queries/use-ticket-messages";
import { useProfile } from "@/lib/queries/use-profile";
import { MESSAGE_THREAD_TEXT } from "@/lib/constants/text/tickets.text";
import { MessageItem } from "../message-item";
import type { MessageThreadProps } from "./message-thread.types";

export function MessageThread({ ticketId }: MessageThreadProps) {
  const messagesQuery = useTicketMessages(ticketId);
  const profile = useProfile();

  if (messagesQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label={MESSAGE_THREAD_TEXT.LOADING} />
      </div>
    );
  }

  if (messagesQuery.isError) {
    return <Alert tone="danger">{messagesQuery.error.message}</Alert>;
  }

  if (!messagesQuery.data || messagesQuery.data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-secondary">
        {MESSAGE_THREAD_TEXT.EMPTY}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      {messagesQuery.data.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwnMessage={message.senderId === profile.data?.id}
        />
      ))}
    </div>
  );
}

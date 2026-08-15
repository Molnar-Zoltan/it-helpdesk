import type { Metadata } from "next";
import { AiChatView } from "./_components/ai-chat-view";
import { AI_CHAT_TEXT } from "@/lib/constants/text/tickets.text";

export const metadata: Metadata = {
  title: AI_CHAT_TEXT.META_TITLE,
};

export default function AiChatPage() {
  return <AiChatView />;
}

import type { AiChatRole } from "@helpdesk/shared";

export interface AiChatMessageProps {
  role: AiChatRole;
  content: string;
}

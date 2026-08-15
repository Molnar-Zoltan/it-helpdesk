import type { AiChatRole } from "@helpdesk/shared";

export interface AiAssistantMessageProps {
  role: AiChatRole;
  content: string;
}

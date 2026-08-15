import type { AiChatRole } from "@helpdesk/shared";

export interface TranscriptEntry {
  id: string;
  role: AiChatRole;
  content: string;
}

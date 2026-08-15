export interface AiChatComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isSending?: boolean;
}

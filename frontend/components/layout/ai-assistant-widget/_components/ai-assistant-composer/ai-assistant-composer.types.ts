export interface AiAssistantComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isSending?: boolean;
}

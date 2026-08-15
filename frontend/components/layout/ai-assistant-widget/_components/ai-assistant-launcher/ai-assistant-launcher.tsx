import { MessageCircle } from "lucide-react";
import { AI_ASSISTANT_TEXT } from "@/lib/constants/text/ai-assistant.text";
import type { AiAssistantLauncherProps } from "./ai-assistant-launcher.types";

/**
 * The collapsed state: a fixed bottom-right circular button, the
 * Messenger-style "bubble" AiAssistantWidget shows once the customer
 * closes the window. Fixed positioning + a high z-index so it floats
 * above every page's own content regardless of that page's layout.
 */
export function AiAssistantLauncher({ onOpen }: AiAssistantLauncherProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={AI_ASSISTANT_TEXT.OPEN_ARIA_LABEL}
      className="fixed right-5 bottom-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-accent-done text-bg shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-done"
    >
      <MessageCircle aria-hidden="true" className="h-6 w-6" />
    </button>
  );
}

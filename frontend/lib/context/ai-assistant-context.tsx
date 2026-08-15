"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AiAssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

/**
 * Lets anything in the tree -- not just AiAssistantWidget itself -- open
 * the floating widget, e.g. TicketListView/NewTicketView's "Open AI
 * Assistant" links now that there's no /tickets/ai-chat page to navigate
 * to. Deliberately plain useState + Context rather than a URL param or
 * a persisted store: this is ephemeral UI chrome state (like UserMenu's
 * dropdown open/close), not something that should survive a hard refresh
 * or show up in the URL.
 *
 * Defaults open (per the confirmed "open by default" decision) and stays
 * mounted for the lifetime of the layout, so state persists across
 * client-side navigation the same way a real Messenger window would stay
 * open while browsing other pages -- it only resets on a full reload.
 */
export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const value = useMemo<AiAssistantContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
}

export function useAiAssistant(): AiAssistantContextValue {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error("useAiAssistant must be used within an AiAssistantProvider");
  }
  return context;
}

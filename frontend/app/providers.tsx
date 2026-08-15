"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, type CSSProperties } from "react";
import { Toaster } from "sonner";
import { AiAssistantProvider } from "@/lib/context/ai-assistant-context";

/**
 * Maps sonner's themeable CSS variables onto this app's own design tokens
 * (app/globals.css's @theme block) instead of using sonner's built-in
 * richColors palette, so toasts look like part of this app rather than a
 * generic library default. "normal" toasts (e.g. login's welcome-back)
 * stay dark/neutral; "success" toasts (e.g. register) get an accent-done
 * (teal-green) border — the app's existing "done/success" color, already
 * used for checkmarks and confirmation states elsewhere.
 */
const toasterThemeVars = {
  "--normal-bg": "var(--color-surface-raised)",
  "--normal-border": "var(--color-border)",
  "--normal-text": "var(--color-text)",
  "--success-bg": "var(--color-surface-raised)",
  "--success-border": "var(--color-accent-done)",
  "--success-text": "var(--color-text)",
} as CSSProperties;

export function Providers({ children }: { children: ReactNode }) {
  // Created inside state so each browser session gets its own client instead
  // of a module-level singleton shared across requests on the server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AiAssistantProvider>{children}</AiAssistantProvider>
      <Toaster theme="dark" position="top-right" style={toasterThemeVars} />
    </QueryClientProvider>
  );
}

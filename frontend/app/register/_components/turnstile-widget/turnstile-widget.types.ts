export interface TurnstileWidgetHandle {
  /**
   * Resets the widget so it issues a fresh, unspent token. Turnstile
   * tokens are single-use — required after any failed registration
   * attempt (including the WEAK_PASSWORD_WARNING soft-confirm resubmit
   * in RegisterForm), since the previous token was already consumed by
   * that attempt's TurnstileGuard verification regardless of why the
   * request ultimately failed.
   */
  reset: () => void;
}

export interface TurnstileWidgetProps {
  /** Called with a fresh token once the visitor completes the challenge. */
  onVerify: (token: string) => void;
  /** Called when a previously-issued token expires (~5 min) before use. */
  onExpire?: () => void;
  /** Called if the widget itself fails to render or verify. */
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

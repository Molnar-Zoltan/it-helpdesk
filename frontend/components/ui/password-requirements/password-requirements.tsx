import {
  PASSWORD_MIN_LENGTH,
  hasMinLength,
  hasUppercase,
  hasLowercase,
  hasDigit,
  hasSpecialChar,
  containsEmoji,
} from "@helpdesk/shared";
import { cn } from "@/lib/utils";
import { PASSWORD_REQUIREMENTS_TEXT } from "@/lib/constants/text/validation.text";
import type { PasswordRequirementsProps } from "./password-requirements.types";

const REQUIREMENTS: { label: string; test: (value: string) => boolean }[] = [
  { label: `${PASSWORD_MIN_LENGTH}+ characters`, test: hasMinLength },
  { label: PASSWORD_REQUIREMENTS_TEXT.UPPERCASE, test: hasUppercase },
  { label: PASSWORD_REQUIREMENTS_TEXT.LOWERCASE, test: hasLowercase },
  { label: PASSWORD_REQUIREMENTS_TEXT.DIGIT, test: hasDigit },
  { label: PASSWORD_REQUIREMENTS_TEXT.SPECIAL_CHAR, test: hasSpecialChar },
  { label: PASSWORD_REQUIREMENTS_TEXT.NO_EMOJI, test: (value) => !containsEmoji(value) },
];

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const started = password.length > 0;

  return (
    // Live region: this is the only feedback shown for the password
    // field now that FormField's own error text is visually hidden here
    // (see register-form.tsx / password-tab.tsx) to avoid repeating the
    // same information twice — so changes need to be announced on their
    // own rather than relying on aria-describedby.
    <ul aria-live="polite" className="flex flex-col gap-1">
      {REQUIREMENTS.map(({ label, test }) => {
        const met = test(password);
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              !started
                ? "text-text-muted"
                : met
                  ? "text-accent-done"
                  : "text-accent-danger",
            )}
          >
            <span aria-hidden="true">{!started ? "•" : met ? "✓" : "✕"}</span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

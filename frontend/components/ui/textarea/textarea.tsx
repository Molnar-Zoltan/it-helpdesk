import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { TextAreaProps } from "./textarea.types";

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, hasError, rows = 5, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          hasError
            ? "border-accent-danger focus:ring-accent-danger"
            : "border-border-strong focus:ring-accent-done",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
TextArea.displayName = "TextArea";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { InputProps } from "./input.types";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-md border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted",
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
Input.displayName = "Input";

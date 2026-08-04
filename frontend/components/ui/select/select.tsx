import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { SelectProps } from "./select.types";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full cursor-pointer rounded-md border bg-surface px-3 py-2 text-sm text-text",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          hasError
            ? "border-accent-danger focus:ring-accent-danger"
            : "border-border-strong focus:ring-accent-done",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

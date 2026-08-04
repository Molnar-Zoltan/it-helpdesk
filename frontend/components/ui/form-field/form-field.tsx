import { useId } from "react";
import { cn } from "@/lib/utils";
import type { FormFieldProps } from "./form-field.types";

export function FormField({
  label,
  error,
  hint,
  hideVisibleError,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-secondary">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? errorId : hint ? hintId : undefined,
      })}
      {error ? (
        <p
          id={errorId}
          className={hideVisibleError ? "sr-only" : "text-xs text-accent-danger"}
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

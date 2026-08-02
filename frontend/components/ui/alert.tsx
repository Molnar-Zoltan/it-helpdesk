import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AlertTone = "danger" | "done" | "neutral";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

const toneClasses: Record<AlertTone, string> = {
  danger: "border-accent-danger/30 bg-accent-danger/10 text-accent-danger",
  done: "border-accent-done/30 bg-accent-done/10 text-accent-done",
  neutral: "border-border-strong bg-surface-raised text-text-secondary",
};

export function Alert({ className, tone = "neutral", role, children, ...props }: AlertProps) {
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

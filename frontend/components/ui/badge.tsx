import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "done" | "active" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-raised text-text-secondary border-border-strong",
  done: "bg-accent-done/10 text-accent-done border-accent-done/30",
  active: "bg-accent-active/10 text-accent-active border-accent-active/30",
  danger: "bg-accent-danger/10 text-accent-danger border-accent-danger/30",
};

const dotClasses: Record<BadgeTone, string> = {
  neutral: "bg-text-muted",
  done: "bg-accent-done",
  active: "bg-accent-active",
  danger: "bg-accent-danger",
};

export function Badge({ className, tone = "neutral", dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])}
        />
      )}
      {children}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { CardProps } from "./card.types";

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5",
        className,
      )}
      {...props}
    />
  );
}

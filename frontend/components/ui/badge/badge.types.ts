import { type HTMLAttributes } from "react";

export type BadgeTone = "neutral" | "done" | "active" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

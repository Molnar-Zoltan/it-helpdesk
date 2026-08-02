import { type HTMLAttributes } from "react";

export type AlertTone = "danger" | "done" | "neutral";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
}

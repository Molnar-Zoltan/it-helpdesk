import type { ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Disables closing via Escape/backdrop click — for in-flight destructive
   * actions where an accidental dismiss shouldn't silently cancel. */
  preventClose?: boolean;
}

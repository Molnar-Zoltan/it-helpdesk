import type { ZodType } from "zod";
import type { ButtonVariant } from "@/components/ui/button";
import type { useCloseTicket } from "@/lib/mutations/use-close-ticket";

/**
 * Shared shape between useCloseTicket(id) and useReopenTicket(id) -- both
 * take a { reason: string } payload and resolve to a TicketResponse.
 * Structurally identical, so the same modal drives either mutation
 * without needing its own generic parameter.
 */
export type TicketStatusMutation = ReturnType<typeof useCloseTicket>;

export interface TicketStatusModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  confirmLabel: string;
  confirmVariant: ButtonVariant;
  successToast: string;
  schema: ZodType<{ reason: string }, { reason: string }>;
  mutation: TicketStatusMutation;
}

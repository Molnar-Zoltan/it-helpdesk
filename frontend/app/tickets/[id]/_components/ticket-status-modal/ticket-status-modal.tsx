"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { TICKET_STATUS_MODAL_TEXT } from "@/lib/constants/text/tickets.text";
import type { TicketStatusModalProps } from "./ticket-status-modal.types";

/**
 * Drives both the close and reopen confirmation flows off one component --
 * they're structurally identical (a required reason, a confirm/cancel
 * pair, a password-less mutation) and only differ in copy, styling, and
 * which mutation they call. Same reasoning as CloseTicketDto/ReopenTicketDto
 * staying separate on the backend while sharing this one frontend shape.
 * Mirrors DeleteAccountTab's Modal pattern (components/ui/modal, a form
 * inside it, preventClose while the mutation is in flight).
 */
export function TicketStatusModal({
  open,
  onClose,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmLabel,
  confirmVariant,
  successToast,
  schema,
  mutation,
}: TicketStatusModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ reason: string }>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  const closeModal = () => {
    onClose();
    reset();
    mutation.reset();
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      toast.success(successToast);
      closeModal();
    } catch {
      // Surfaced below via mutation.error (e.g. ticket already closed by
      // another tab, or -- for reopen's TICKET_NOT_CLOSED case -- a race
      // with a second reopen attempt).
    }
  });

  return (
    <Modal open={open} onClose={closeModal} title={title} preventClose={mutation.isPending}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{description}</p>

        <FormField label={reasonLabel} error={errors.reason?.message}>
          {(field) => (
            <TextArea
              {...field}
              rows={3}
              placeholder={reasonPlaceholder}
              hasError={Boolean(errors.reason)}
              {...register("reason")}
            />
          )}
        </FormField>

        {mutation.isError && <Alert tone="danger">{mutation.error.message}</Alert>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={mutation.isPending}>
            {TICKET_STATUS_MODAL_TEXT.CANCEL}
          </Button>
          <Button type="submit" variant={confirmVariant} isLoading={mutation.isPending}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

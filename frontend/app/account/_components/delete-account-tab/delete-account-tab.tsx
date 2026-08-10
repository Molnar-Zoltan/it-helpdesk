"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { useDeleteAccount } from "@/lib/mutations/use-delete-account";
import {
  deleteAccountSchema,
  type DeleteAccountFormValues,
} from "@/lib/validation/account-schemas";
import { DemoAccountNotice } from "../demo-account-notice";
import { DELETE_ACCOUNT_TAB_TEXT } from "@/lib/constants/text/account.text";

interface DeleteAccountTabProps {
  isDemo: boolean;
}

// currentPassword required, confirmed via a modal per the settled 5.4
// design decision — password re-verification is already required, so a
// second "type your email to confirm" step would be redundant friction
// rather than added safety. Ticket/message history is preserved
// (anonymized, not deleted) per UsersService.deleteAccount — see
// docs/schema.md's GDPR section — but that's backend behavior with no
// frontend surface, so it isn't mentioned in this copy.
export function DeleteAccountTab({ isDemo }: DeleteAccountTabProps) {
  const router = useRouter();
  const deleteAccountMutation = useDeleteAccount();
  const [modalOpen, setModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { currentPassword: "" },
  });

  const currentPasswordValue = watch("currentPassword");

  const closeModal = () => {
    setModalOpen(false);
    reset();
    deleteAccountMutation.reset();
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await deleteAccountMutation.mutateAsync(values);
      toast.success(DELETE_ACCOUNT_TAB_TEXT.SUCCESS_TOAST);
      // Same destination as logout (see header.tsx) — "/" already renders
      // the logged-out header state correctly.
      router.push("/");
    } catch {
      // Surfaced below via deleteAccountMutation.error (e.g. wrong
      // password, demo account).
    }
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text">{DELETE_ACCOUNT_TAB_TEXT.HEADING}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {DELETE_ACCOUNT_TAB_TEXT.DESCRIPTION}
        </p>
      </div>

      {isDemo && <DemoAccountNotice />}

      <Button
        type="button"
        variant="danger"
        className="self-start"
        disabled={isDemo}
        onClick={() => setModalOpen(true)}
      >
        {DELETE_ACCOUNT_TAB_TEXT.TRIGGER_BUTTON}
      </Button>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={DELETE_ACCOUNT_TAB_TEXT.MODAL_TITLE}
        preventClose={deleteAccountMutation.isPending}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            {DELETE_ACCOUNT_TAB_TEXT.MODAL_BODY}
          </p>

          <FormField
            label={DELETE_ACCOUNT_TAB_TEXT.CURRENT_PASSWORD_LABEL}
            error={errors.currentPassword?.message}
          >
            {(field) => (
              <PasswordInput
                {...field}
                autoComplete="current-password"
                hasError={Boolean(errors.currentPassword)}
                {...register("currentPassword")}
              />
            )}
          </FormField>

          {deleteAccountMutation.isError && (
            <Alert tone="danger">{deleteAccountMutation.error.message}</Alert>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={deleteAccountMutation.isPending}
            >
              {DELETE_ACCOUNT_TAB_TEXT.CANCEL}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={currentPasswordValue.length === 0}
              isLoading={deleteAccountMutation.isPending}
            >
              {DELETE_ACCOUNT_TAB_TEXT.CONFIRM_BUTTON}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

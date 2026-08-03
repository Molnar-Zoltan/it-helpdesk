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

// currentPassword required, confirmed via a modal per the settled 5.4
// design decision — password re-verification is already required, so a
// second "type your email to confirm" step would be redundant friction
// rather than added safety. Ticket/message history is preserved
// (anonymized, not deleted) per UsersService.deleteAccount — see
// docs/schema.md's GDPR section — but that's backend behavior with no
// frontend surface, so it isn't mentioned in this copy.
export function DeleteAccountTab() {
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
      toast.success("Account deleted.");
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
        <h2 className="text-lg font-semibold text-text">Delete account</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Permanently deletes your account. This can&apos;t be undone.
        </p>
      </div>

      <Button
        type="button"
        variant="danger"
        className="self-start"
        onClick={() => setModalOpen(true)}
      >
        Delete account
      </Button>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Delete your account?"
        preventClose={deleteAccountMutation.isPending}
      >
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            This permanently deletes your account and can&apos;t be undone.
            Enter your password to confirm.
          </p>

          <FormField
            label="Current password"
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
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={currentPasswordValue.length === 0}
              isLoading={deleteAccountMutation.isPending}
            >
              Delete account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

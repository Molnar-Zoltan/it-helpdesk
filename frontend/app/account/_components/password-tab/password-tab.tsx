"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useChangePassword } from "@/lib/mutations/use-change-password";
import { ApiError } from "@/lib/api/client";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validation/account-schemas";

// currentPassword required + revokes every other active session — matches
// the backend's design (see docs/architecture.md's account self-service
// table). The WEAK_PASSWORD_WARNING soft-confirm flow mirrors register's
// (Step 5.3): a 422 isn't a hard failure, it's a breach warning the user
// can acknowledge and resubmit past.
export function PasswordTab() {
  const changePasswordMutation = useChangePassword();
  const [weakPasswordWarning, setWeakPasswordWarning] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const newPasswordValue = watch("newPassword") ?? "";

  const submit = async (
    values: ChangePasswordFormValues,
    acknowledgeWeakPassword: boolean,
  ) => {
    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        ...(acknowledgeWeakPassword ? { acknowledgeWeakPassword: true } : {}),
      });
      reset();
      setWeakPasswordWarning(false);
      toast.success(
        "Password updated. Your other sessions will be signed out the next time they try to refresh.",
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "WEAK_PASSWORD_WARNING") {
        setWeakPasswordWarning(true);
        return;
      }
      // Any other error (wrong currentPassword, demo account, etc.) is
      // surfaced below via changePasswordMutation.error.
    }
  };

  const onValidSubmit = handleSubmit((values) => submit(values, false));
  const confirmWeakPassword = handleSubmit((values) => submit(values, true));

  return (
    <form onSubmit={onValidSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Password</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Changing your password signs out your other sessions the next
          time they try to refresh — this device stays signed in.
        </p>
      </div>

      <FormField label="Current password" error={errors.currentPassword?.message}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            hasError={Boolean(errors.currentPassword)}
            {...register("currentPassword", {
              onChange: () => {
                if (getValues("newPassword")) {
                  void trigger("newPassword");
                }
              },
            })}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-2">
        <FormField
          label="New password"
          error={errors.newPassword?.message}
          hideVisibleError
        >
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              hasError={Boolean(errors.newPassword)}
              {...register("newPassword", {
                onChange: () => {
                  // A changed password invalidates a prior breach
                  // acknowledgement — it needs to be re-checked.
                  setWeakPasswordWarning(false);
                  void trigger("newPassword");
                  if (getValues("confirmNewPassword")) {
                    void trigger("confirmNewPassword");
                  }
                },
              })}
            />
          )}
        </FormField>
        <PasswordRequirements password={newPasswordValue} />
      </div>

      <FormField
        label="Confirm new password"
        error={errors.confirmNewPassword?.message}
      >
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="new-password"
            hasError={Boolean(errors.confirmNewPassword)}
            {...register("confirmNewPassword", {
              onChange: () => void trigger("confirmNewPassword"),
            })}
          />
        )}
      </FormField>

      {weakPasswordWarning && (
        <Alert tone="danger">
          <p>
            This password has appeared in a known data breach. We recommend
            choosing a different one.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            isLoading={changePasswordMutation.isPending}
            onClick={confirmWeakPassword}
          >
            Use this password anyway
          </Button>
        </Alert>
      )}

      {!weakPasswordWarning && changePasswordMutation.isError && (
        <Alert tone="danger">{changePasswordMutation.error.message}</Alert>
      )}

      <Button
        type="submit"
        isLoading={changePasswordMutation.isPending && !weakPasswordWarning}
        className="self-start"
      >
        Update password
      </Button>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useChangeEmail } from "@/lib/mutations/use-change-email";
import {
  changeEmailSchema,
  type ChangeEmailFormValues,
} from "@/lib/validation/account-schemas";
import type { UserProfile } from "@/lib/api/types";

interface EmailTabProps {
  profile: UserProfile;
}

// currentPassword required + revokes every other active session — same
// re-verification pattern as the Password tab (see docs/architecture.md's
// account self-service table). newEmail defaults to the current address,
// so "isDirty" alone is enough to keep the submit button disabled until
// the value actually changes — no separate "must differ" rule needed here
// the way changePasswordSchema needed one for currentPassword/newPassword.
export function EmailTab({ profile }: EmailTabProps) {
  const changeEmailMutation = useChangeEmail();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      currentPassword: "",
      newEmail: profile.email,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changeEmailMutation.mutateAsync(values);
      reset({ currentPassword: "", newEmail: values.newEmail });
      toast.success(
        "Email updated. Your other sessions will be signed out the next time they try to refresh.",
      );
    } catch {
      // Surfaced below via changeEmailMutation.error (e.g. wrong password,
      // email already in use).
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-text">Email</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Used to log in and identify your account. Changing it signs out
          your other sessions the next time they try to refresh — this
          device stays signed in.
        </p>
      </div>

      <FormField label="New email" error={errors.newEmail?.message}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            hasError={Boolean(errors.newEmail)}
            {...register("newEmail")}
          />
        )}
      </FormField>

      <FormField
        label="Current password"
        error={errors.currentPassword?.message}
        hint="Required to confirm this change."
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

      {changeEmailMutation.isError && (
        <Alert tone="danger">{changeEmailMutation.error.message}</Alert>
      )}

      <Button
        type="submit"
        disabled={!isDirty}
        isLoading={changeEmailMutation.isPending}
        className="self-start"
      >
        Update email
      </Button>
    </form>
  );
}

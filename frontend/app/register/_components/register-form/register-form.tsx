"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useRegister } from "@/lib/mutations/use-register";
import { ApiError } from "@/lib/api/client";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validation/auth-schemas";
import { PasswordRequirements } from "../password-requirements";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const registerMutation = useRegister();

  // True once the backend has warned that the submitted password appeared
  // in a known breach (422 WEAK_PASSWORD_WARNING). Not a hard error — the
  // user can resubmit the same form with acknowledgeWeakPassword: true.
  const [weakPasswordWarning, setWeakPasswordWarning] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    // firstName/lastName/email: validate once the field is first left, then
    // live on every change after that. Password/confirmPassword override
    // this with their own onChange handlers below, validating from the
    // first keystroke instead of waiting for a blur.
    mode: "onTouched",
  });

  // Drives the live requirements checklist below the password field.
  const passwordValue = watch("password") ?? "";

  const submit = async (
    values: RegisterFormValues,
    acknowledgeWeakPassword: boolean,
  ) => {
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        ...(acknowledgeWeakPassword ? { acknowledgeWeakPassword: true } : {}),
      });
      router.push(redirectTo);
    } catch (error) {
      if (error instanceof ApiError && error.code === "WEAK_PASSWORD_WARNING") {
        setWeakPasswordWarning(true);
        return;
      }
      // Any other error is surfaced below via registerMutation.error.
    }
  };

  const onValidSubmit = handleSubmit((values) => submit(values, false));
  const confirmWeakPassword = handleSubmit((values) => submit(values, true));

  return (
    <form onSubmit={onValidSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="First name" error={errors.firstName?.message}>
          {(field) => (
            <Input
              {...field}
              autoComplete="given-name"
              placeholder="Jane"
              hasError={Boolean(errors.firstName)}
              {...register("firstName")}
            />
          )}
        </FormField>

        <FormField label="Last name" error={errors.lastName?.message}>
          {(field) => (
            <Input
              {...field}
              autoComplete="family-name"
              placeholder="Doe"
              hasError={Boolean(errors.lastName)}
              {...register("lastName")}
            />
          )}
        </FormField>
      </div>

      <FormField label="Email" error={errors.email?.message}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            hasError={Boolean(errors.email)}
            {...register("email")}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-2">
        <FormField label="Password" error={errors.password?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              autoComplete="new-password"
              hasError={Boolean(errors.password)}
              {...register("password", {
                onChange: () => {
                  // A changed password invalidates a prior breach
                  // acknowledgement — it needs to be re-checked, not
                  // silently waved through under the old confirmation.
                  setWeakPasswordWarning(false);
                  void trigger("password");
                  // If confirm-password already has a value, re-check the
                  // match too, so editing password back to matching (or
                  // away from it) is reflected immediately rather than
                  // waiting for the user to revisit that field.
                  if (getValues("confirmPassword")) {
                    void trigger("confirmPassword");
                  }
                },
              })}
            />
          )}
        </FormField>
        <PasswordRequirements password={passwordValue} />
      </div>

      <FormField label="Confirm password" error={errors.confirmPassword?.message}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="new-password"
            hasError={Boolean(errors.confirmPassword)}
            {...register("confirmPassword", {
              onChange: () => void trigger("confirmPassword"),
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
            isLoading={registerMutation.isPending}
            onClick={confirmWeakPassword}
          >
            Use this password anyway
          </Button>
        </Alert>
      )}

      {!weakPasswordWarning && registerMutation.isError && (
        <Alert tone="danger">{registerMutation.error.message}</Alert>
      )}

      <Button
        type="submit"
        isLoading={registerMutation.isPending && !weakPasswordWarning}
        className="mt-1"
      >
        Create account
      </Button>
    </form>
  );
}

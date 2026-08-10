"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useRegister } from "@/lib/mutations/use-register";
import { ApiError } from "@/lib/api/client";
import { API_ERROR_CODES } from "@helpdesk/shared";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validation/auth-schemas";
import { PasswordRequirements } from "@/components/ui/password-requirements";
import { TurnstileWidget } from "../turnstile-widget";
import type { TurnstileWidgetHandle } from "../turnstile-widget";
import { REGISTER_TEXT } from "@/lib/constants/text/auth.text";
import { ROUTES } from "@/lib/constants/routes.constants";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? ROUTES.HOME;

  const registerMutation = useRegister();

  // True once the backend has warned that the submitted password appeared
  // in a known breach (422 WEAK_PASSWORD_WARNING). Not a hard error — the
  // user can resubmit the same form with acknowledgeWeakPassword: true.
  const [weakPasswordWarning, setWeakPasswordWarning] = useState(false);

  // Turnstile tokens are single-use, so this is cleared (and the widget
  // reset) after every failed submission, not just successful ones —
  // see the catch block in submit() below.
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

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
    if (!turnstileToken) {
      return;
    }

    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        turnstileToken,
        ...(acknowledgeWeakPassword ? { acknowledgeWeakPassword: true } : {}),
      });
      toast.success(REGISTER_TEXT.SUCCESS_TOAST);
      router.push(redirectTo);
    } catch (error) {
      // The token above was already spent by this attempt's TurnstileGuard
      // verification, win or lose — reset so the widget issues a fresh one
      // before either the retry button or the weak-password confirm below
      // can be used again.
      turnstileRef.current?.reset();
      setTurnstileToken(null);

      if (error instanceof ApiError && error.code === API_ERROR_CODES.WEAK_PASSWORD_WARNING) {
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
        <FormField label={REGISTER_TEXT.FIRST_NAME_LABEL} error={errors.firstName?.message}>
          {(field) => (
            <Input
              {...field}
              autoComplete="given-name"
              placeholder={REGISTER_TEXT.FIRST_NAME_PLACEHOLDER}
              hasError={Boolean(errors.firstName)}
              {...register("firstName")}
            />
          )}
        </FormField>

        <FormField label={REGISTER_TEXT.LAST_NAME_LABEL} error={errors.lastName?.message}>
          {(field) => (
            <Input
              {...field}
              autoComplete="family-name"
              placeholder={REGISTER_TEXT.LAST_NAME_PLACEHOLDER}
              hasError={Boolean(errors.lastName)}
              {...register("lastName")}
            />
          )}
        </FormField>
      </div>

      <FormField label={REGISTER_TEXT.EMAIL_LABEL} error={errors.email?.message}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            placeholder={REGISTER_TEXT.EMAIL_PLACEHOLDER}
            hasError={Boolean(errors.email)}
            {...register("email")}
          />
        )}
      </FormField>

      <div className="flex flex-col gap-2">
        <FormField
          label={REGISTER_TEXT.PASSWORD_LABEL}
          error={errors.password?.message}
          hideVisibleError
        >
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

      <FormField label={REGISTER_TEXT.CONFIRM_PASSWORD_LABEL} error={errors.confirmPassword?.message}>
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

      <div className="flex flex-col gap-2">
        <TurnstileWidget
          ref={turnstileRef}
          onVerify={(token) => {
            setTurnstileToken(token);
            setTurnstileError(false);
          }}
          onExpire={() => setTurnstileToken(null)}
          onError={() => {
            setTurnstileToken(null);
            setTurnstileError(true);
          }}
        />
        {turnstileError && (
          <Alert tone="danger">
            {REGISTER_TEXT.CAPTCHA_ERROR}
          </Alert>
        )}
      </div>

      {weakPasswordWarning && (
        <Alert tone="danger">
          <p>{REGISTER_TEXT.WEAK_PASSWORD_WARNING}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            isLoading={registerMutation.isPending}
            disabled={!turnstileToken}
            onClick={confirmWeakPassword}
          >
            {REGISTER_TEXT.USE_ANYWAY}
          </Button>
        </Alert>
      )}

      {!weakPasswordWarning && registerMutation.isError && (
        <Alert tone="danger">{registerMutation.error.message}</Alert>
      )}

      <Button
        type="submit"
        isLoading={registerMutation.isPending && !weakPasswordWarning}
        disabled={!turnstileToken}
        className="mt-1"
      >
        {REGISTER_TEXT.SUBMIT}
      </Button>
    </form>
  );
}

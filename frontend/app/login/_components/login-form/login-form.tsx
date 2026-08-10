"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import { API_ERROR_CODES } from "@helpdesk/shared";
import { useLogin } from "@/lib/mutations/use-login";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth-schemas";
import { LOGIN_TEXT } from "@/lib/constants/text/auth.text";
import { ROUTES } from "@/lib/constants/routes.constants";

/** "125" -> "2:05". Only ever fed values under an hour (window is minutes). */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by proxy.ts when it redirects an unauthenticated visitor away from a
  // protected route (none exist yet — see PROTECTED_ROUTE_PREFIXES). Falls
  // back to home, per the Step 5.3 decision to land there post-login.
  const redirectTo = searchParams.get("redirectTo") ?? ROUTES.HOME;

  const loginMutation = useLogin();

  // Step 6: on a 429 LOGIN_RATE_LIMITED response, ApiError carries
  // retryAfterSeconds (forwarded unchanged through handleTokenResponse).
  // Ticks down locally via setTimeout so the alert/button reflect a live
  // countdown rather than a static "try again later" — the backend is
  // still the real enforcement point regardless of what this shows.
  //
  // The lockout is keyed by email+IP on the backend, so it's scoped to a
  // single email here too — captured from the actual attempted payload
  // (loginMutation.variables), not the live form value, since by the time
  // this effect runs the person may already be editing the field. Without
  // this, trying a different account after a lockout would require a page
  // refresh instead of just... typing a different email.
  const [lockout, setLockout] = useState<{
    email: string;
    remaining: number;
  } | null>(null);

  useEffect(() => {
    const error = loginMutation.error;
    if (
      loginMutation.isError &&
      error instanceof ApiError &&
      error.code === API_ERROR_CODES.LOGIN_RATE_LIMITED &&
      typeof error.retryAfterSeconds === "number"
    ) {
      const attemptedEmail = loginMutation.variables?.email ?? "";
      setLockout({
        email: attemptedEmail.trim().toLowerCase(),
        remaining: error.retryAfterSeconds,
      });
    }
  }, [loginMutation.isError, loginMutation.error, loginMutation.variables]);

  useEffect(() => {
    if (!lockout || lockout.remaining <= 0) return;
    const timer = setTimeout(() => {
      setLockout((prev) =>
        prev ? { ...prev, remaining: prev.remaining - 1 } : null,
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockout]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Disabling until both fields have something typed is just "don't let a
  // blank form submit" — unlike register's password checklist, there's no
  // nuanced feedback being hidden here, so a disabled button doesn't cost
  // anything in discoverability.
  const [email, password] = watch(["email", "password"]);

  const isLockedOutForCurrentEmail =
    lockout !== null &&
    lockout.remaining > 0 &&
    email?.trim().toLowerCase() === lockout.email;

  // The rate-limit error is only meaningful for the email it applied to —
  // once the person's typed a different one, the mutation's last error is
  // stale and shouldn't block the button or show a confusing message.
  const isRateLimitError =
    loginMutation.isError &&
    loginMutation.error instanceof ApiError &&
    loginMutation.error.code === API_ERROR_CODES.LOGIN_RATE_LIMITED;

  const canSubmit =
    Boolean(email) && Boolean(password) && !isLockedOutForCurrentEmail;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      toast(LOGIN_TEXT.WELCOME_BACK_TOAST);
      router.push(redirectTo);
    } catch {
      // Surfaced below via loginMutation.error — nothing else to do here.
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField label={LOGIN_TEXT.EMAIL_LABEL} error={errors.email?.message}>
        {(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="email"
            hasError={Boolean(errors.email)}
            {...register("email")}
          />
        )}
      </FormField>

      <FormField label={LOGIN_TEXT.PASSWORD_LABEL} error={errors.password?.message}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            hasError={Boolean(errors.password)}
            {...register("password")}
          />
        )}
      </FormField>

      {isLockedOutForCurrentEmail ? (
        <Alert tone="danger">
          {LOGIN_TEXT.lockoutMessage(formatCountdown(lockout.remaining))}
        </Alert>
      ) : (
        loginMutation.isError &&
        !isRateLimitError && (
          <Alert tone="danger">{loginMutation.error.message}</Alert>
        )
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        isLoading={loginMutation.isPending}
        className="mt-1"
      >
        {LOGIN_TEXT.SUBMIT}
      </Button>
    </form>
  );
}

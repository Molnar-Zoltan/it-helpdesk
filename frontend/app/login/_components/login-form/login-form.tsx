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
import { useLogin } from "@/lib/mutations/use-login";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth-schemas";

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
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const loginMutation = useLogin();

  // Step 6: on a 429 LOGIN_RATE_LIMITED response, ApiError carries
  // retryAfterSeconds (forwarded unchanged through handleTokenResponse).
  // Ticks down locally via setTimeout so the alert/button reflect a live
  // countdown rather than a static "try again later" — the backend is
  // still the real enforcement point regardless of what this shows.
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    const error = loginMutation.error;
    if (
      loginMutation.isError &&
      error instanceof ApiError &&
      error.code === "LOGIN_RATE_LIMITED" &&
      typeof error.retryAfterSeconds === "number"
    ) {
      setLockoutRemaining(error.retryAfterSeconds);
    }
  }, [loginMutation.isError, loginMutation.error]);

  useEffect(() => {
    if (lockoutRemaining === null || lockoutRemaining <= 0) return;
    const timer = setTimeout(() => {
      setLockoutRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockoutRemaining]);

  const isLockedOut = lockoutRemaining !== null && lockoutRemaining > 0;

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
  const canSubmit = Boolean(email) && Boolean(password) && !isLockedOut;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      toast("Welcome back!");
      router.push(redirectTo);
    } catch {
      // Surfaced below via loginMutation.error — nothing else to do here.
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormField label="Email" error={errors.email?.message}>
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

      <FormField label="Password" error={errors.password?.message}>
        {(field) => (
          <PasswordInput
            {...field}
            autoComplete="current-password"
            hasError={Boolean(errors.password)}
            {...register("password")}
          />
        )}
      </FormField>

      {isLockedOut ? (
        <Alert tone="danger">
          Too many login attempts. Try again in {formatCountdown(lockoutRemaining)}.
        </Alert>
      ) : (
        loginMutation.isError && (
          <Alert tone="danger">{loginMutation.error.message}</Alert>
        )
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        isLoading={loginMutation.isPending}
        className="mt-1"
      >
        Log in
      </Button>
    </form>
  );
}

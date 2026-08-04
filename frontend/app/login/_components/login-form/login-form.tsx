"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { useLogin } from "@/lib/mutations/use-login";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth-schemas";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set by proxy.ts when it redirects an unauthenticated visitor away from a
  // protected route (none exist yet — see PROTECTED_ROUTE_PREFIXES). Falls
  // back to home, per the Step 5.3 decision to land there post-login.
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const loginMutation = useLogin();

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
  const canSubmit = Boolean(email) && Boolean(password);

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

      {loginMutation.isError && (
        <Alert tone="danger">{loginMutation.error.message}</Alert>
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

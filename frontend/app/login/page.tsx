import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Log in — IT Helpdesk",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Log in</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Welcome back — enter your details to continue.
        </p>
      </div>

      <Card>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent-done hover:underline">
          Create one
        </Link>
      </p>

      <p className="text-center text-xs text-text-muted">
        Trying the demo? Use <code>customer@helpdesk.dev</code> /{" "}
        <code>password123</code>.
      </p>
    </div>
  );
}

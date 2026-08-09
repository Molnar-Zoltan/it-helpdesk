import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./_components/login-form";
import { LOGIN_TEXT } from "@/lib/constants/text/auth.text";

export const metadata: Metadata = {
  title: LOGIN_TEXT.META_TITLE,
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">{LOGIN_TEXT.HEADING}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {LOGIN_TEXT.SUBHEADING}
        </p>
      </div>

      <Card>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        {LOGIN_TEXT.NO_ACCOUNT_PROMPT}{" "}
        <Link href="/register" className="text-accent-done hover:underline">
          {LOGIN_TEXT.CREATE_ONE_LINK}
        </Link>
      </p>

      <p className="text-center text-xs text-text-muted">
        {LOGIN_TEXT.DEMO_HINT_PREFIX} <code>customer@helpdesk.dev</code> /{" "}
        <code>password123</code>.
      </p>
    </div>
  );
}

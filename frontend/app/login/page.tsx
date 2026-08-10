import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { DEMO_USERS, DEMO_PASSWORD } from "@helpdesk/shared";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./_components/login-form";
import { LOGIN_TEXT } from "@/lib/constants/text/auth.text";
import { ROUTES } from "@/lib/constants/routes.constants";

export const metadata: Metadata = {
  title: LOGIN_TEXT.META_TITLE,
};

// The customer account is the one worth pointing a first-time visitor at
// — it's the role this app's ticket-filing flow is actually built for
// (see docs/api-endpoints.md's ticket access rules). Pulled from
// @helpdesk/shared's DEMO_USERS/DEMO_PASSWORD (the same fixture seed.ts
// inserts from) rather than hardcoded here, so this hint can't drift from
// what the seed data actually creates.
const demoCustomer = DEMO_USERS.find((user) => user.role === "CUSTOMER")!;

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
        <Link href={ROUTES.REGISTER} className="text-accent-done hover:underline">
          {LOGIN_TEXT.CREATE_ONE_LINK}
        </Link>
      </p>

      <p className="text-center text-xs text-text-muted">
        {LOGIN_TEXT.DEMO_HINT_PREFIX} <code>{demoCustomer.email}</code> /{" "}
        <code>{DEMO_PASSWORD}</code>.
      </p>
    </div>
  );
}

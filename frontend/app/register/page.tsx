import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./_components/register-form";
import { REGISTER_TEXT } from "@/lib/constants/text/auth.text";

export const metadata: Metadata = {
  title: REGISTER_TEXT.META_TITLE,
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">{REGISTER_TEXT.HEADING}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {REGISTER_TEXT.SUBHEADING}
        </p>
      </div>

      <Card>
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        {REGISTER_TEXT.HAVE_ACCOUNT_PROMPT}{" "}
        <Link href="/login" className="text-accent-done hover:underline">
          {REGISTER_TEXT.LOG_IN_LINK}
        </Link>
      </p>
    </div>
  );
}

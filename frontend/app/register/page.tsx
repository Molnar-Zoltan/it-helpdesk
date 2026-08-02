import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Create account — IT Helpdesk",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Create an account</h1>
        <p className="mt-1 text-sm text-text-secondary">
          File tickets and track their progress.
        </p>
      </div>

      <Card>
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-done hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

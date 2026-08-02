"use client";

import Link from "next/link";
import { useProfile } from "@/lib/queries/use-profile";

export function AuthStatusBanner() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) return null;

  if (!profile) {
    return (
      <p className="mt-6 text-sm text-[#8A96A6]">
        <Link
          href="/login"
          className="text-[#4FD1C5] underline decoration-[#212A35] underline-offset-4 hover:text-[#E7ECF1]"
        >
          Log in
        </Link>{" "}
        or{" "}
        <Link
          href="/register"
          className="text-[#4FD1C5] underline decoration-[#212A35] underline-offset-4 hover:text-[#E7ECF1]"
        >
          create an account
        </Link>{" "}
        to try it out.
      </p>
    );
  }

  return (
    <p className="mt-6 text-sm text-[#4FD1C5]">
      Welcome back, {profile.firstName}. You&apos;re signed in as{" "}
      {profile.role.toLowerCase()}.
    </p>
  );
}

"use client";

import Link from "next/link";
import { useProfile } from "@/lib/queries/use-profile";
import { HOME_TEXT } from "@/lib/constants/text/common.text";

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
          {HOME_TEXT.AUTH_BANNER_LOG_IN}
        </Link>{" "}
        {HOME_TEXT.AUTH_BANNER_OR}{" "}
        <Link
          href="/register"
          className="text-[#4FD1C5] underline decoration-[#212A35] underline-offset-4 hover:text-[#E7ECF1]"
        >
          {HOME_TEXT.AUTH_BANNER_CREATE_ACCOUNT}
        </Link>{" "}
        {HOME_TEXT.AUTH_BANNER_TRY_IT_OUT}
      </p>
    );
  }

  return (
    <p className="mt-6 text-sm text-[#4FD1C5]">
      {HOME_TEXT.authBannerWelcomeBack(profile.firstName, profile.role.toLowerCase())}
    </p>
  );
}

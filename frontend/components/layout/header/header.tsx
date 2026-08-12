"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/queries/use-profile";
import { useLogout } from "@/lib/mutations/use-logout";
import { UserMenu } from "@/components/layout/user-menu";
import { Spinner } from "@/components/ui/spinner";
import { HEADER_TEXT } from "@/lib/constants/text/common.text";
import { ROUTES } from "@/lib/constants/routes.constants";

export function Header() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const logoutMutation = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href={ROUTES.HOME}
          className="font-mono text-sm font-semibold tracking-wide text-text"
        >
          {HEADER_TEXT.LOGO}
        </Link>

        <nav className="flex items-center gap-6">
          {/*
            Tickets is customer-only (Step 9.6.3 — filing/viewing your own
            tickets isn't a thing for an AGENT/ADMIN account, which uses
            Queue below instead). A CUSTOMER-only check, not just "logged
            in", now that Queue exists as the agent/admin equivalent.
          */}
          {profile && profile.role === "CUSTOMER" && (
            <Link
              href={ROUTES.TICKETS}
              className="text-sm text-text-secondary transition-colors hover:text-text"
            >
              {HEADER_TEXT.NAV_TICKETS}
            </Link>
          )}

          {/*
            Queue is agent/admin-only — a CUSTOMER navigating to the URL
            directly still gets a friendly in-page message (see
            TicketQueueView), this just keeps the nav itself from
            advertising a link that role can't use.
          */}
          {profile &&
            (profile.role === "AGENT" || profile.role === "ADMIN") && (
              <Link
                href={ROUTES.TICKET_QUEUE}
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                {HEADER_TEXT.NAV_QUEUE}
              </Link>
            )}

          {isLoading ? (
            <Spinner label={HEADER_TEXT.LOADING_ACCOUNT} />
          ) : profile ? (
            <UserMenu
              firstName={profile.firstName}
              role={profile.role}
              isLoggingOut={logoutMutation.isPending}
              onLogout={() =>
                logoutMutation.mutate(undefined, {
                  onSuccess: () => router.push("/"),
                })
              }
            />
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href={ROUTES.LOGIN}
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                {HEADER_TEXT.NAV_LOG_IN}
              </Link>
              <Link
                href={ROUTES.REGISTER}
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                {HEADER_TEXT.NAV_SIGN_UP}
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

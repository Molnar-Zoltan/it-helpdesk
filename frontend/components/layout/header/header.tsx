"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/queries/use-profile";
import { useLogout } from "@/lib/mutations/use-logout";
import { UserMenu } from "@/components/layout/user-menu";

export function Header() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const logoutMutation = useLogout();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-wide text-text"
        >
          IT Helpdesk
        </Link>

        <nav className="flex items-center gap-6">
          {/*
            Tickets only makes sense once there's a session, so there's no
            point showing a logged-out visitor a link that just bounces
            them to /login. Account and Log out now live inside UserMenu's
            dropdown rather than as separate nav items.

            Points at /tickets/new rather than /tickets for now — the
            ticket list page doesn't exist yet (Step 5.6). Flip this back
            to "/tickets" / "Tickets" once it does.
          */}
          {profile && (
            <Link
              href="/tickets/new"
              className="text-sm text-text-secondary transition-colors hover:text-text"
            >
              New ticket
            </Link>
          )}

          {isLoading ? null : profile ? (
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
                href="/login"
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

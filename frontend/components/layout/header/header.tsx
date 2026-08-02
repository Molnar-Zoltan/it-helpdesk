"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/queries/use-profile";
import { useLogout } from "@/lib/mutations/use-logout";
import { Button } from "@/components/ui/button";

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
            Tickets/Account only make sense once there's a session — both
            routes will require auth once built (5.4+), so there's no point
            showing a logged-out visitor a link that just bounces them to
            /login.
          */}
          {profile && (
            <>
              <Link
                href="/tickets"
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                Tickets
              </Link>
              <Link
                href="/account"
                className="text-sm text-text-secondary transition-colors hover:text-text"
              >
                Account
              </Link>
            </>
          )}

          {isLoading ? null : profile ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">
                {profile.firstName}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="px-0 py-0 text-sm font-normal hover:bg-transparent"
                isLoading={logoutMutation.isPending}
                onClick={() =>
                  logoutMutation.mutate(undefined, {
                    onSuccess: () => router.push("/"),
                  })
                }
              >
                Log out
              </Button>
            </div>
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

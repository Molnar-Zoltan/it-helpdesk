"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { formatRole } from "@/lib/utils";
import type { UserMenuProps } from "./user-menu.types";

export function UserMenu({
  firstName,
  role,
  onLogout,
  isLoggingOut,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border-strong text-text-secondary transition-colors hover:text-text"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2 text-xs text-text-muted">
            Signed in as{" "}
            <span className="text-text-secondary">{firstName}</span>{" "}
            <span className="text-text-muted">· {formatRole(role)}</span>
          </div>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text"
          >
            Account
          </Link>

          <button
            type="button"
            role="menuitem"
            disabled={isLoggingOut}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

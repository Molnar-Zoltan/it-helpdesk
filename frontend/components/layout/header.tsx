import Link from "next/link";

const navLinks = [
  { href: "/tickets", label: "Tickets" },
  { href: "/account", label: "Account" },
];

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-wide text-text"
        >
          IT Helpdesk
        </Link>

        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-secondary transition-colors hover:text-text"
            >
              {link.label}
            </Link>
          ))}
          {/*
            TODO (5.2): replace this static placeholder with a real
            useProfile()-driven login/logout control once the auth
            proxy + query hooks exist.
          */}
          <Link
            href="/login"
            className="text-sm text-text-secondary transition-colors hover:text-text"
          >
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}

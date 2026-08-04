export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-4 text-center text-xs text-text-muted">
        <p>
          IT Helpdesk — a portfolio project.{" "}
          <a
            href="https://github.com/Molnar-Zoltan/it-helpdesk"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border-strong underline-offset-2 hover:text-text-secondary"
          >
            Source on GitHub
          </a>
        </p>
        <p className="mt-1">
          &copy; {year} Zoltán Molnár
        </p>
      </div>
    </footer>
  );
}

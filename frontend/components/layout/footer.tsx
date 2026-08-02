export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-text-muted">
        it-helpdesk — a portfolio project.{" "}
        <a
          href="https://github.com/Molnar-Zoltan/it-helpdesk"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border-strong underline-offset-2 hover:text-text-secondary"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}

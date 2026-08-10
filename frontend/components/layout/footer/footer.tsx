import { FOOTER_TEXT } from "@/lib/constants/text/common.text";
import { GITHUB_REPO_URL } from "@/lib/constants/routes.constants";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-4 text-center text-xs text-text-muted">
        <p>
          {FOOTER_TEXT.TAGLINE}{" "}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border-strong underline-offset-2 hover:text-text-secondary"
          >
            {FOOTER_TEXT.SOURCE_LINK_LABEL}
          </a>
        </p>
        <p className="mt-1">
          {FOOTER_TEXT.copyright(year)}
        </p>
      </div>
    </footer>
  );
}

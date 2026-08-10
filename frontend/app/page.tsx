import { AuthStatusBanner } from "./_components/auth-status-banner";
import { HOME_TEXT, HOME_BUILD_PLAN_PHASES, type Phase } from "@/lib/constants/text/common.text";
import { GITHUB_REPO_URL } from "@/lib/constants/routes.constants";

const statusStyles: Record<Phase["status"], string> = {
  done: "text-[#4FD1C5]",
  active: "text-[#F2A93B]",
  planned: "text-[#4A5568]",
};

const statusMarks: Record<Phase["status"], string> = {
  done: "✓",
  active: "›",
  planned: "·",
};

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#0B0F14] px-6 py-20">
      <main className="w-full max-w-lg">
        <div className="flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-[0.2em] text-[#8A96A6]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F2A93B] opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F2A93B]" />
          </span>
          {HOME_TEXT.SYSTEM_STATUS_LABEL}
        </div>

        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-[#E7ECF1] sm:text-4xl">
          {HOME_TEXT.HEADING}
        </h1>

        <p className="mt-4 text-base leading-7 text-[#8A96A6]">
          {HOME_TEXT.INTRO}
        </p>

        <AuthStatusBanner />

        <div className="mt-10 rounded-lg border border-[#212A35] bg-[#121821]">
          <div className="border-b border-[#212A35] px-5 py-3 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-[0.15em] text-[#4A5568]">
            {HOME_TEXT.BUILD_PLAN_LABEL}
          </div>
          <ul className="divide-y divide-[#212A35]">
            {HOME_BUILD_PLAN_PHASES.map((phase) => (
              <li
                key={phase.label}
                className="flex items-center gap-3 px-5 py-3 font-[family-name:var(--font-geist-mono)] text-sm"
              >
                <span
                  className={`w-4 shrink-0 text-center ${statusStyles[phase.status]}`}
                  aria-hidden
                >
                  {statusMarks[phase.status]}
                </span>
                <span
                  className={
                    phase.status === "planned"
                      ? "text-[#4A5568]"
                      : "text-[#E7ECF1]"
                  }
                >
                  {phase.label}
                </span>
                <span
                  className={`ml-auto text-[11px] uppercase tracking-wider ${statusStyles[phase.status]}`}
                >
                  {phase.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-[#8A96A6] underline decoration-[#212A35] underline-offset-4 transition-colors hover:text-[#E7ECF1] hover:decoration-[#F2A93B]"
        >
          {HOME_TEXT.GITHUB_CTA}
          <span aria-hidden>↗</span>
        </a>
      </main>
    </div>
  );
}

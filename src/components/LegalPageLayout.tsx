import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useHashScroll } from "../hooks/useHashScroll";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
};

export function LegalPageLayout({
  eyebrow,
  title,
  introduction,
  children,
}: LegalPageLayoutProps) {
  useHashScroll();

  return (
    <div className="papaya-kit min-h-screen w-full bg-paper">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <article className="mx-auto w-full max-w-[840px] px-4 py-14 md:px-6 md:py-20 lg:px-8">
          <Link
            className="text-sm font-semibold text-action underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
            to="/"
          >
            Back to Papaya Health
          </Link>
          <header className="mt-8 border-b border-line pb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[36px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink md:text-[48px]">
              {title}
            </h1>
            <p className="mt-5 max-w-[68ch] text-base leading-7 text-muted">
              {introduction}
            </p>
            <p className="mt-4 text-sm text-muted">
              Last updated: September 9, 2026
            </p>
          </header>

          <div className="space-y-9 py-10 text-base leading-7 text-muted">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

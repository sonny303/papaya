import { Link } from "react-router-dom";

import { PapayaLogo } from "./PapayaLogo";

const exploreLinks = [
  { label: "Home", to: "/#main-content" },
  { label: "Our Solutions", to: "/#our-solutions" },
  { label: "Who We Serve", to: "/who-we-serve" },
  { label: "For Patients", to: "/who-we-serve#patients" },
  { label: "For Partners", to: "/who-we-serve#partners" },
  { label: "For Clinics", to: "/who-we-serve#clinics" },
  { label: "About Us", to: "/about-us" },
];

const legalLinks = [
  { label: "Terms of Service", to: "/terms" },
  { label: "Privacy Policy", to: "/privacy" },
];

export function SiteFooter() {
  return (
    <footer
      className="border-t border-line bg-surface"
      aria-label="Site footer"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 py-12 md:px-6 md:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr_0.6fr] lg:gap-12">
          <div className="max-w-xl">
            <Link
              to="/"
              aria-label="Papaya Health home"
              className="inline-flex rounded-control bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
            >
              <PapayaLogo alt="" className="w-[190px]" />
            </Link>
            <p className="mt-6 text-sm leading-6 text-muted">
              Papaya Health does not diagnose, treat, cure, or prevent diseases
              or act as a substitute for medical care. Information provided by
              Papaya Health is not medical advice and is not intended to replace
              the advice of your doctor.
            </p>
          </div>

          <nav aria-label="Explore">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              Explore
            </h2>
            <ul className="mt-4 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    className="text-sm text-muted underline-offset-4 hover:text-action hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink">
              Legal
            </h2>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    className="text-sm text-muted underline-offset-4 hover:text-action hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="text-sm text-muted underline-offset-4 hover:text-action hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf"
                  href="/THIRD_PARTY_NOTICES.txt"
                >
                  Third-party notices
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-sm text-muted">
          <p>© 2026 Papaya Health. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

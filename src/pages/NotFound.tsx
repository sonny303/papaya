import { Link } from "react-router-dom";

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export function NotFound() {
  return (
    <div className="papaya-kit min-h-screen w-full bg-paper">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] px-4 py-20 outline-none md:px-6 lg:px-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
          404
        </p>
        <h1 className="mt-3 max-w-[18ch] text-[36px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink md:text-[48px]">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-5 max-w-[56ch] text-lg leading-8 text-muted">
          The address may have changed, or the page may no longer be available.
        </p>
        <Link to="/" className="p-button p-button--primary mt-8">
          Return home
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

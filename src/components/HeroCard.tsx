import { Link } from "react-router-dom";

import { Card } from "./Card";

export function HeroCard() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-6 md:py-12 lg:px-8 lg:py-16"
    >
      <Card
        tone="peach"
        className="relative isolate min-h-[430px] overflow-hidden !rounded-feature !border-0 !p-0 shadow-[0_16px_48px_rgba(48,47,41,0.08)] md:min-h-[520px]"
      >
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 size-56 rounded-full bg-papaya md:-right-12 md:-top-28 md:size-80"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -left-20 size-64 rounded-full bg-leaf-soft md:-bottom-40 md:-left-16 md:size-96"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-10 right-10 size-12 rounded-full bg-coral md:bottom-16 md:right-20 md:size-16"
        />

        <div className="relative z-10 flex min-h-[430px] items-center px-6 py-16 md:min-h-[520px] md:px-12 lg:px-16">
          <div className="max-w-[880px]">
            <h1
              id="hero-heading"
              className="text-[32px] font-semibold leading-[1.14] tracking-[-0.035em] text-ink sm:text-[38px] md:text-[48px] md:leading-[1.08]"
            >
              Everything you and your partner need to know, track, and organize
              before you try to conceive — in one place you own, built around
              your health, not your health plan.
            </h1>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:mt-10">
              <Link
                className="p-button p-button--primary"
                to="/who-we-serve#patients"
              >
                Join the waitlist
              </Link>
              <Link
                className="p-button p-button--outline"
                to="/who-we-serve#clinics"
              >
                Explore a clinic pilot
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

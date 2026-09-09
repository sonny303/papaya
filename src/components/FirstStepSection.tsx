import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "./Card";

export function FirstStepSection() {
  return (
    <section
      aria-labelledby="first-step-heading"
      className="bg-paper py-16 md:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-[1120px] gap-8 px-4 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            A simple place to begin
          </p>
          <h2
            id="first-step-heading"
            className="mt-3 text-[30px] font-semibold leading-[1.16] tracking-[-0.03em] text-ink md:text-[40px]"
          >
            Start with one thing that helps today.
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-7 text-muted md:text-lg md:leading-8">
            You do not need to build a perfect plan. Open one relevant guide,
            choose one useful step, and decide whether to prepare with someone
            else or keep going on your own.
          </p>
        </div>

        <Card
          tone="butter"
          className="relative overflow-hidden !rounded-feature !border-0 !p-7 shadow-[0_12px_36px_rgba(48,47,41,0.08)] md:!p-9"
        >
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-12 size-36 rounded-full bg-papaya/30"
          />
          <div className="relative">
            <div className="flex size-14 items-center justify-center rounded-card bg-surface text-action shadow-sm">
              <ClipboardCheck aria-hidden="true" size={27} strokeWidth={1.8} />
            </div>
            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.12em] text-warning">
              Your first step
            </p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink md:text-[28px]">
              Start with a fertility assessment today
            </h3>
            <Link
              to="/who-we-serve#patients"
              className="p-button p-button--primary mt-7 w-full justify-between !px-5 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-butter"
            >
              <span>Join the waitlist</span>
              <ArrowRight aria-hidden="true" className="shrink-0" size={19} />
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}

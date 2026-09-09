import { ArrowRight, Heart, Stethoscope, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { audiences } from "../data/audiences";
import { Card } from "./Card";
const audienceIcons: Record<(typeof audiences)[number]["icon"], LucideIcon> = {
  heart: Heart,
  partners: UsersRound,
  clinic: Stethoscope,
};
export function AudienceSection() {
  return (
    <section
      id="our-solutions"
      tabIndex={-1}
      aria-labelledby="audience-heading"
      className="scroll-mt-6 border-t border-line bg-surface py-16 outline-none md:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Made to support the whole picture
          </p>
          <h2
            id="audience-heading"
            className="mt-3 text-[30px] font-semibold leading-[1.16] tracking-[-0.03em] text-ink md:text-[40px]"
          >
            Built for every part of the journey to conception.
          </h2>
        </div>

        <div className="mt-10 grid items-stretch gap-5 md:mt-12 md:grid-cols-3">
          {audiences.map((audience) => {
            const Icon = audienceIcons[audience.icon];
            return (
              <Card
                key={audience.name}
                tone={audience.tone}
                className="relative flex h-full min-h-[390px] flex-col overflow-hidden !rounded-feature !border-0 !p-7 shadow-[0_10px_30px_rgba(48,47,41,0.06)] md:!p-8"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-1.5 ${audience.accentClassName}`}
                />
                <div
                  className={`flex size-14 items-center justify-center rounded-card ${audience.iconClassName}`}
                >
                  <Icon aria-hidden="true" size={27} strokeWidth={1.8} />
                </div>

                <div className="flex flex-1 flex-col">
                  <p className="mt-7 text-sm font-semibold uppercase tracking-[0.12em] text-muted">
                    {audience.name}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink">
                    {audience.headline}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-muted">
                    {audience.description}
                  </p>
                </div>

                <Link
                  to={audience.href}
                  className="p-button p-button--primary mt-8 w-full min-w-0 justify-between !px-5 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2"
                >
                  <span className="min-w-0 whitespace-normal">
                    {audience.linkLabel}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="shrink-0"
                    size={19}
                  />
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

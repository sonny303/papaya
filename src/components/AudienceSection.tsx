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
      className="home-audience scroll-mt-6 outline-none"
    >
      <div className="home-container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Made to support the whole picture
          </p>
          <h2
            id="audience-heading"
            className="mt-3 text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-ink md:text-[36px]"
          >
            Built for every part of the journey to conception.
          </h2>
        </div>

        <div className="audience-grid">
          {audiences.map((audience) => {
            const Icon = audienceIcons[audience.icon];
            return (
              <Card
                key={audience.name}
                tone={audience.tone}
                className="audience-card relative flex h-full flex-col !rounded-feature !border-0 !p-6 md:!p-8"
              >
                <div
                  className={`flex size-14 items-center justify-center rounded-full ${audience.iconClassName}`}
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

import { Card } from "./Card";

export function AboutSection() {
  return (
    <section
      id="about-us"
      aria-labelledby="about-heading"
      className="scroll-mt-6 border-t border-line bg-surface py-16 md:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-4 md:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8">
        <header className="max-w-md lg:sticky lg:top-10 lg:self-start">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-action">
            About us
          </p>
          <h1
            id="about-heading"
            className="mt-3 text-[32px] font-semibold leading-[1.14] tracking-[-0.03em] text-ink md:text-[40px]"
          >
            From searching alone to preparing together.
          </h1>
          <div aria-hidden="true" className="mt-7 flex items-center gap-2">
            <span className="size-3 rounded-full bg-papaya" />
            <span className="size-3 rounded-full bg-coral" />
            <span className="h-3 w-10 rounded-full bg-leaf" />
          </div>
        </header>

        <div className="space-y-6">
          <p className="text-lg leading-8 text-muted">
            Like many women, I used to only see my doctor once a year for an
            annual check-in. But the moment my partner and I started thinking
            about pregnancy, everything changed. Suddenly, I found myself deep
            in late-night research spirals between appointments, trying to piece
            together conflicting advice and keep my partner looped into every
            decision.
          </p>

          <Card
            tone="peach"
            className="!rounded-feature !border-0 !p-7 md:!p-9"
          >
            <p className="text-[24px] font-semibold leading-[1.3] tracking-[-0.02em] text-ink md:text-[28px]">
              It quickly became clear that this journey shouldn&apos;t feel so
              overwhelming or isolating. It should be a shared, supported
              experience.
            </p>
          </Card>

          <p className="text-lg leading-8 text-muted">
            That&apos;s why Papaya Health was created. We built the single,
            trusted home we wished we had — a place where you, your partner, and
            your care team can learn, track, and navigate every step of
            pre-pregnancy wellness together.
          </p>
        </div>
      </div>
    </section>
  );
}

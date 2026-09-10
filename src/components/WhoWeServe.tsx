import { Card } from "./Card";

export function WhoWeServeContent() {
  return (
    <main id="main-content" tabIndex={-1} className="bg-paper outline-none">
      <section
        aria-labelledby="who-we-serve-heading"
        className="mx-auto w-full max-w-[1120px] px-4 py-14 md:px-6 md:py-20 lg:px-8"
      >
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-action">
            Who we serve
          </p>
          <h1
            id="who-we-serve-heading"
            className="text-[36px] font-semibold leading-[1.12] tracking-[-0.035em] text-ink md:text-[48px] md:leading-[1.08]"
          >
            Built for families and the clinics that support them.
          </h1>
        </div>
      </section>

      <section
        id="patients"
        tabIndex={-1}
        aria-labelledby="patients-heading"
        className="scroll-mt-6 bg-surface py-14 outline-none md:py-20"
      >
        <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8">
          <Card
            tone="peach"
            className="!rounded-feature !border-0 !p-7 md:!p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-action">
              For patients
            </p>
            <h2
              id="patients-heading"
              className="mt-3 text-[28px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink md:text-[36px]"
            >
              Join the waitlist
            </h2>
            <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted">
              Be first to know when Papaya Health is ready to help you and your
              partner prepare for conception together.
            </p>
          </Card>
        </div>
      </section>

      <section
        id="partners"
        tabIndex={-1}
        aria-labelledby="partners-heading"
        className="scroll-mt-6 bg-paper py-14 outline-none md:py-20"
      >
        <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8">
          <Card
            tone="butter"
            className="!rounded-feature !border-0 !p-7 md:!p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-warning">
              For partners
            </p>
            <h2
              id="partners-heading"
              className="mt-3 text-[28px] font-semibold leading-[1.2] tracking-[-0.025em] text-ink md:text-[36px]"
            >
              Prepare side by side
            </h2>
            <p className="mt-4 max-w-[58ch] text-base leading-7 text-muted">
              Build shared context around what matters, what comes next, and how
              you can support each other while preparing for conception.
            </p>
          </Card>
        </div>
      </section>

      <section
        id="clinics"
        tabIndex={-1}
        aria-labelledby="clinics-heading"
        className="scroll-mt-6 bg-surface py-14 outline-none md:py-20"
      >
        <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            <div className="flex flex-col justify-center py-2 lg:pr-10">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf">
                For clinics
              </p>
              <h2
                id="clinics-heading"
                className="mt-3 max-w-[18ch] text-[30px] font-semibold leading-[1.16] tracking-[-0.03em] text-ink md:text-[40px]"
              >
                Bring approved guidance into the space between visits.
              </h2>
              <p className="mt-5 max-w-[62ch] text-base leading-7 text-muted md:text-lg md:leading-8">
                Papaya is preparing a small Indiana pilot with clinics that want
                families to have clearer educational material, useful
                preparation steps, and trusted outside resources.
              </p>
            </div>

            <Card
              tone="leaf"
              className="flex flex-col justify-center !rounded-feature !border-0 !p-7 md:!p-10"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-leaf">
                Clinic pilot
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-ink md:text-[28px]">
                Explore a clinic pilot
              </h3>
              <p className="mt-4 max-w-[48ch] text-base leading-7 text-muted">
                Learn how a Papaya Health pilot can support patients before they
                begin trying to conceive.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

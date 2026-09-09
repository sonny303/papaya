export function ReadyTogetherSection() {
  return (
    <section
      aria-labelledby="ready-together-heading"
      className="bg-surface py-16 md:py-20 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 md:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-feature bg-leaf text-surface shadow-[0_16px_48px_rgba(48,47,41,0.1)] lg:grid-cols-[0.92fr_1.08fr] lg:items-stretch">
          <div className="flex flex-col justify-center px-7 py-12 sm:px-10 md:py-16 lg:px-14 lg:py-20">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-butter">
              Prepare in your own way
            </p>
            <h2
              id="ready-together-heading"
              className="mt-4 max-w-[13ch] text-[34px] font-semibold leading-[1.12] tracking-[-0.035em] text-surface md:text-[46px]"
            >
              Less scattered. Less alone. More ready.
            </h2>
            <p className="mt-6 max-w-[48ch] text-lg leading-8 text-surface/85">
              Your pre-pregnancy, organized around you — and the people
              preparing alongside you.
            </p>
          </div>

          <figure className="relative min-h-[320px] overflow-hidden sm:min-h-[400px] lg:min-h-[520px]">
            <img
              src="/assets/couple-planning.jpg"
              alt="Two partners making plans together at a table at home"
              className="absolute inset-0 size-full object-cover"
              width="1448"
              height="1086"
              loading="lazy"
              decoding="async"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}

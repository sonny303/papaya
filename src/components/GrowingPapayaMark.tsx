import { PapayaLogo } from "./PapayaLogo";

const growingSeeds = [
  { cx: 67, cy: 70 },
  { cx: 82, cy: 67 },
  { cx: 58, cy: 82 },
  { cx: 88, cy: 84 },
  { cx: 54, cy: 98 },
  { cx: 77, cy: 101 },
  { cx: 62, cy: 114 },
] as const;

export function GrowingPapayaMark() {
  return (
    <section
      aria-label="Papaya Health"
      className="overflow-hidden bg-surface py-14 md:py-16"
    >
      <div className="mx-auto flex w-full max-w-[1120px] justify-center px-4 md:px-6 lg:px-8">
        <div
          className="relative w-full max-w-[430px]"
          role="img"
          aria-label="Papaya Health logo with seeds growing inside the papaya"
        >
          <PapayaLogo alt="" compact className="block h-auto w-full" />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 368 168"
            preserveAspectRatio="xMidYMid meet"
          >
            {growingSeeds.map((seed) => (
              <circle
                key={`${seed.cx}-${seed.cy}`}
                className="papaya-seed"
                cx={seed.cx}
                cy={seed.cy}
                r="4.2"
                fill="#302f29"
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

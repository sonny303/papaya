import { PapayaLogo } from "./PapayaLogo";

export function GrowingPapayaMark() {
  return (
    <section
      aria-label="Papaya Health"
      className="overflow-hidden bg-surface py-14 md:py-16"
    >
      <div className="mx-auto flex w-full max-w-[1120px] justify-center px-4 md:px-6 lg:px-8">
        <div
          className="w-full max-w-[430px]"
          role="img"
          aria-label="Papaya Health logo with seeds growing inside the papaya"
        >
          <PapayaLogo alt="" animated className="w-full" />
        </div>
      </div>
    </section>
  );
}

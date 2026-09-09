import { LegalPageLayout } from "../components/LegalPageLayout";
import { termsSections } from "../data/legal";

export function Terms() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms of Service"
      introduction="These general terms describe the basic rules for using the Papaya Health website. They are intentionally concise and may be updated as the service develops."
    >
      {termsSections.map((section) => (
        <section key={section.title}>
          <h2 className="text-xl font-semibold leading-7 text-ink">
            {section.title}
          </h2>
          <p className="mt-3">{section.body}</p>
        </section>
      ))}
    </LegalPageLayout>
  );
}

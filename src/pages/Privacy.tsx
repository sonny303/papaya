import { LegalPageLayout } from "../components/LegalPageLayout";
import { privacySections } from "../data/legal";

export function Privacy() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      introduction="This general policy explains the kinds of website information Papaya Health may receive and the basic ways that information may be used."
    >
      {privacySections.map((section) => (
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

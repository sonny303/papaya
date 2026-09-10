import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function FirstStepSection() {
  return (
    <div className="home-container home-closing">
      <section
        aria-labelledby="first-step-heading"
        className="first-step-panel"
      >
        <p className="home-eyebrow">A simple place to begin</p>
        <h2 id="first-step-heading">Start with one thing that helps today.</h2>
        <p className="home-body">
          You do not need to build a perfect plan. Open one relevant guide,
          choose one useful step, and decide whether to prepare with someone
          else or keep going on your own.
        </p>
        <div className="first-step-decoration" aria-hidden="true" />
      </section>
      <section
        aria-labelledby="assessment-heading"
        className="assessment-panel"
      >
        <div className="assessment-icon">
          <ClipboardCheck aria-hidden="true" size={48} strokeWidth={1.6} />
        </div>
        <div className="assessment-copy">
          <p className="home-eyebrow">Coming soon</p>
          <h2 id="assessment-heading">
            Know where you stand. Start your fertility assessment.
          </h2>
          <p className="home-body">
            Answer a few questions about your health and goals. No account
            needed to begin. Get a personalized starting point with tailored
            guidance based on your situation. Takes about 5 minutes.
          </p>
        </div>
        <Link
          to="/who-we-serve#patients"
          className="p-button p-button--primary"
        >
          Join the waitlist <ArrowRight aria-hidden="true" size={20} />
        </Link>
      </section>
    </div>
  );
}

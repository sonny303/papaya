import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroCard() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="home-container hero-section"
    >
      <div className="home-hero">
        <div className="hero-copy">
          <h1 id="hero-heading">
            Everything you and your partner need to know, track, and organize
            before you try to conceive — in one place you own, built around your
            health, not your health plan.
          </h1>
          <div className="hero-actions">
            <Link
              className="p-button p-button--primary"
              to="/who-we-serve#patients"
            >
              Join the waitlist <ArrowRight aria-hidden="true" size={20} />
            </Link>
            <Link
              className="p-button p-button--outline"
              to="/who-we-serve#clinics"
            >
              Explore a clinic pilot
            </Link>
          </div>
        </div>
        <figure className="hero-photo">
          <picture>
            <source
              type="image/avif"
              srcSet="/assets/couple-planning-640.avif 640w, /assets/couple-planning-768.avif 768w, /assets/couple-planning-960.avif 960w, /assets/couple-planning-1448.avif 1448w"
              sizes="(min-width: 1024px) 580px, calc(100vw - 40px)"
            />
            <img
              src="/assets/couple-planning.jpg"
              alt="Two partners making plans together at a table at home"
              width="1448"
              height="1086"
              fetchPriority="high"
            />
          </picture>
        </figure>
      </div>
    </section>
  );
}

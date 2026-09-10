import { AboutSection } from "../components/AboutSection";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { useHashScroll } from "../hooks/useHashScroll";

export function About() {
  useHashScroll();

  return (
    <div className="papaya-kit min-h-screen w-full bg-paper">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <AboutSection />
      </main>
      <SiteFooter />
    </div>
  );
}

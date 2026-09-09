import { AudienceSection } from "../components/AudienceSection";
import { FirstStepSection } from "../components/FirstStepSection";
import { HeroCard } from "../components/HeroCard";
import { ReadyTogetherSection } from "../components/ReadyTogetherSection";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { useHashScroll } from "../hooks/useHashScroll";

export function Home() {
  useHashScroll();

  return (
    <div id="top" className="papaya-kit min-h-screen w-full bg-paper">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="outline-none">
        <HeroCard />
        <AudienceSection />
        <ReadyTogetherSection />
        <FirstStepSection />
      </main>
      <SiteFooter />
    </div>
  );
}

import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { WhoWeServeContent } from "../components/WhoWeServe";
import { useHashScroll } from "../hooks/useHashScroll";

export function WhoWeServe() {
  useHashScroll();

  return (
    <div className="papaya-kit min-h-screen w-full bg-paper">
      <SiteHeader />
      <WhoWeServeContent />
      <SiteFooter />
    </div>
  );
}

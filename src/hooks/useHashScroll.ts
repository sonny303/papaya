import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useHashScroll() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(location.hash.slice(1));
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);
}

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Papaya Health | Prepare for conception together",
  "/who-we-serve": "Who We Serve | Papaya Health",
  "/about-us": "About Us | Papaya Health",
  "/terms": "Terms of Service | Papaya Health",
  "/privacy": "Privacy Policy | Papaya Health",
};

export function RouteEffects() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const normalizedPath =
      location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");

    document.title =
      routeTitles[normalizedPath] ?? "Page Not Found | Papaya Health";

    if (previousPath.current !== location.pathname && !location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById("main-content")?.focus({ preventScroll: true });
      });
    }

    previousPath.current = location.pathname;
  }, [location.hash, location.pathname]);

  return null;
}

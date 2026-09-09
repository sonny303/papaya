import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import routeMetadataSource from "../data/route-metadata.json";

type RouteMetadata = {
  description: string;
  indexable: boolean;
  title: string;
};

const routeMetadata = routeMetadataSource as Record<string, RouteMetadata>;
const notFoundMetadata: RouteMetadata = {
  title: "Page Not Found | Papaya Health",
  description: "The requested Papaya Health page could not be found.",
  indexable: false,
};

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${key}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function setCanonical(href: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }
  element.href = href;
}

export function RouteEffects() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);

  useEffect(() => {
    const normalizedPath =
      location.pathname === "/" ? "/" : location.pathname.replace(/\/+$/, "");
    const metadata = routeMetadata[normalizedPath] ?? notFoundMetadata;
    const siteOrigin =
      document.head.querySelector<HTMLMetaElement>(
        'meta[name="papaya-site-origin"]',
      )?.content ?? null;
    const canonical = siteOrigin
      ? new URL(normalizedPath, siteOrigin).href
      : null;

    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta(
      "name",
      "robots",
      metadata.indexable && siteOrigin ? "index,follow" : "noindex,follow",
    );
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);
    setCanonical(canonical);

    const openGraphUrl = document.head.querySelector<HTMLMetaElement>(
      'meta[property="og:url"]',
    );
    if (canonical && openGraphUrl) openGraphUrl.content = canonical;
    else if (!canonical) openGraphUrl?.remove();

    if (previousPath.current !== location.pathname && !location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById("main-content")?.focus({ preventScroll: true });
      });
    }

    previousPath.current = location.pathname;
  }, [location.hash, location.pathname]);

  return null;
}

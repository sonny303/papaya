import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { PapayaLogo } from "./PapayaLogo";

const navigationItems = [
  { label: "Our Solutions", href: "/#our-solutions" },
  { label: "Who We Serve", href: "/who-we-serve" },
  { label: "About Us", href: "/about-us" },
] as const;

const navLinkClassName = (isActive: boolean) =>
  [
    "flex min-h-11 items-center rounded-control px-4 text-sm font-semibold transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
    isActive
      ? "bg-leaf-soft text-leaf"
      : "text-ink hover:bg-leaf-soft hover:text-leaf",
  ].join(" ");

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  function isActive(href: string) {
    if (href.startsWith("/#")) {
      return location.pathname === "/" && location.hash === href.slice(1);
    }

    return location.pathname === href;
  }

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="relative z-20 border-b border-line/70 bg-surface">
        <div className="mx-auto flex min-h-[104px] w-full max-w-[1120px] items-center justify-between px-4 md:min-h-[124px] md:px-6 lg:px-8">
          <Link
            to="/"
            aria-label="Papaya Health home"
            className="block shrink-0 rounded-control bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
          >
            <PapayaLogo
              alt=""
              className="w-[190px] sm:w-[220px] md:w-[250px]"
            />
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                aria-current={
                  isActive(item.href)
                    ? item.href.startsWith("/#")
                      ? "location"
                      : "page"
                    : undefined
                }
                className={navLinkClassName(isActive(item.href))}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            ref={toggleButtonRef}
            type="button"
            className="flex size-11 items-center justify-center rounded-control text-ink transition-colors hover:bg-leaf-soft hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:hidden"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? (
              <X aria-hidden="true" size={24} />
            ) : (
              <Menu aria-hidden="true" size={24} />
            )}
          </button>
        </div>

        {isMenuOpen ? (
          <nav
            id="mobile-navigation"
            className="absolute inset-x-0 top-full border-b border-line bg-surface px-4 pb-4 shadow-[0_12px_28px_rgba(48,47,41,0.08)] md:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto flex max-w-[1120px] flex-col gap-1 pt-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={closeMenu}
                  aria-current={
                    isActive(item.href)
                      ? item.href.startsWith("/#")
                        ? "location"
                        : "page"
                      : undefined
                  }
                  className={navLinkClassName(isActive(item.href))}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}

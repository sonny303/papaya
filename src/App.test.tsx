import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App } from "./App";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

const routes = [
  {
    path: "/",
    heading: /everything you and your partner/i,
    title: /Papaya Health \| Prepare/,
  },
  {
    path: "/who-we-serve",
    heading: /built for families/i,
    title: /Who We Serve/,
  },
  { path: "/about-us", heading: /from searching alone/i, title: /About Us/ },
  { path: "/about-us/", heading: /from searching alone/i, title: /About Us/ },
  { path: "/terms", heading: /terms of service/i, title: /Terms of Service/ },
  { path: "/privacy", heading: /privacy policy/i, title: /Privacy Policy/ },
] as const;

describe("public routes", () => {
  for (const route of routes) {
    it(`renders ${route.path}`, async () => {
      window.history.replaceState({}, "", route.path);
      render(<App />);

      expect(
        await screen.findByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await waitFor(() => expect(document.title).toMatch(route.title));
      expect(document.querySelectorAll("main")).toHaveLength(1);
    });
  }

  it("preserves an unknown URL and renders a not-found page", async () => {
    window.history.replaceState({}, "", "/missing-page");
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /couldn't find that page/i,
      }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/missing-page");
  });
});

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";
import { GrowingPapayaMark } from "./GrowingPapayaMark";
import { SiteFooter } from "./SiteFooter";

describe("shared components", () => {
  it("renders card tones without editor-provided components", () => {
    render(<Card tone="peach">Card content</Card>);
    expect(screen.getByText("Card content")).toHaveClass(
      "p-card",
      "p-card--peach",
    );
  });

  it("renders a visible in-flow About mark", () => {
    render(<GrowingPapayaMark />);
    const mark = screen.getByRole("img", { name: /seeds growing inside/i });
    expect(mark).toHaveTextContent("papaya");
    expect(mark.querySelector("svg")).toBeInTheDocument();
    expect(mark.querySelectorAll("circle.papaya-seed")).toHaveLength(7);
  });

  it("uses the supplied joined wordmark in the footer", () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    const homeLink = screen.getByRole("link", { name: "Papaya Health home" });
    expect(homeLink).toContainElement(container.querySelector("img"));
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/papaya-wordmark-v2.svg",
    );
  });
});

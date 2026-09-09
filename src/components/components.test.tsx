import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./Card";
import { GrowingPapayaMark } from "./GrowingPapayaMark";

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
    expect(mark.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/papaya-health-logo.png",
    );
    expect(mark.querySelectorAll("circle")).toHaveLength(7);
  });
});

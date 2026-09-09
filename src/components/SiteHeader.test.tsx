import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SiteHeader } from "./SiteHeader";

afterEach(cleanup);

describe("SiteHeader", () => {
  it("does not mark a section link as current before its hash is active", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <SiteHeader />
      </MemoryRouter>,
    );

    expect(
      screen.getAllByRole("link", { name: "Our Solutions" })[0],
    ).not.toHaveAttribute("aria-current");
  });

  it("closes the mobile menu with Escape and returns focus", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SiteHeader />
      </MemoryRouter>,
    );

    const toggle = screen.getByRole("button", {
      name: /open navigation menu/i,
    });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
});

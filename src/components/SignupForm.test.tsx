import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "./SignupForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SignupForm", () => {
  it("keeps waitlist confirmation after the toast expires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ saved: true }),
      }),
    );
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignupForm kind="waitlist" />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText("Email address"),
      "person@example.com",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector(".signup-success")).toHaveTextContent(
        "Thank you. You’re on the Papaya Health waitlist.",
      );
    });
  });
});

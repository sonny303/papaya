import { expect, test } from "@playwright/test";

test("waitlist preserves input on failure and confirms only acknowledged saving", async ({
  page,
}) => {
  await page.goto("/who-we-serve#patients");
  const form = page.getByRole("form", { name: "Join the waitlist" });
  await form.getByLabel("Email address").fill("website-test@example.com");
  await form.getByRole("checkbox").check();
  await page.route("**/api/submit", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Please try again." }),
    }),
  );
  await form.getByRole("button").click();
  await expect(form.getByRole("alert")).toHaveText("Please try again.");
  await expect(form.getByLabel("Email address")).toHaveValue(
    "website-test@example.com",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.unroute("**/api/submit");
  await page.route("**/api/submit", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      kind: "waitlist",
      email: "website-test@example.com",
      consent: true,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ saved: true }),
    });
  });
  await form.getByRole("button").click();
  await expect(page.getByRole("status")).toContainText(
    "You’re on the Papaya Health waitlist.",
  );
});

test("clinic inquiry collects the selected contact fields", async ({
  page,
}) => {
  await page.goto("/who-we-serve#clinics");
  const form = page.getByRole("form", { name: "Clinic pilot inquiry" });
  await form.getByLabel("Your name").fill("Website Test");
  await form.getByLabel("Clinic name", { exact: true }).fill("Test Clinic");
  await form.getByLabel("Work email").fill("clinic-test@example.com");
  await form.getByRole("checkbox").check();
  await page.route("**/api/submit", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      kind: "clinic",
      name: "Website Test",
      clinic: "Test Clinic",
      consent: true,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ saved: true }),
    });
  });
  await form.getByRole("button").click();
  await expect(page.getByRole("status")).toContainText(
    "Your clinic pilot inquiry has been saved.",
  );
});

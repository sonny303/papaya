import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", heading: /everything you and your partner/i },
  { path: "/who-we-serve", heading: /built for families/i },
  { path: "/about-us", heading: /from searching alone/i },
  { path: "/terms", heading: /terms of service/i },
  { path: "/privacy", heading: /privacy policy/i },
] as const;

for (const route of routes) {
  test(`${route.path} loads directly and passes automated accessibility checks`, async ({
    page,
  }) => {
    const requests = new Set<string>();
    const failedRequests: string[] = [];
    const errorResponses: string[] = [];
    page.on("request", (request) => requests.add(request.url()));
    page.on("requestfailed", (request) => {
      failedRequests.push(
        `${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown error"})`,
      );
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        errorResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(route.path, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);

    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(errorResponses).toEqual([]);

    for (const requestUrl of requests) {
      expect(new URL(requestUrl).origin).toBe("http://127.0.0.1:4173");
    }
  });
}

test("partner navigation resolves to and focuses the partner section", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /learn more for partners/i }).click();

  await expect(page).toHaveURL(/\/who-we-serve#partners$/);
  await expect(page.locator("#partners")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: /prepare side by side/i }),
  ).toBeVisible();
});

test("mobile navigation closes with Escape and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  const toggle = page.locator('button[aria-controls="mobile-navigation"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("responsive layouts preserve complete actions without horizontal overflow", async ({
  page,
}) => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.addStyleTag({
      content: "html { scroll-behavior: auto !important; }",
    });

    const hasOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasOverflow, `horizontal overflow at ${width}px`).toBe(false);

    for (const label of [
      "Learn more for patients",
      "Learn more for partners",
      "Learn more for clinics",
    ]) {
      const action = page.getByRole("link", { name: label });
      await action.evaluate((element) =>
        element.scrollIntoView({ block: "center" }),
      );
      await expect(action).toBeVisible();
      await expect(action).toContainText(label);
      const actionGeometry = await action.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hitTarget = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );

        return {
          isClipped:
            element.scrollWidth > element.clientWidth ||
            element.scrollHeight > element.clientHeight,
          isInViewport:
            bounds.width > 0 &&
            bounds.height >= 44 &&
            bounds.left >= 0 &&
            bounds.right <= window.innerWidth &&
            bounds.top >= 0 &&
            bounds.bottom <= window.innerHeight,
          isHitTarget:
            hitTarget === element ||
            (hitTarget !== null && element.contains(hitTarget)),
        };
      });
      expect(
        actionGeometry.isClipped,
        `${label} is clipped at ${width}px`,
      ).toBe(false);
      expect(
        actionGeometry.isInViewport,
        `${label} is outside the viewport at ${width}px`,
      ).toBe(true);
      expect(
        actionGeometry.isHitTarget,
        `${label} is not pointer-operable at ${width}px`,
      ).toBe(true);
    }
  }
});

test("trailing-slash routes retain the correct page title", async ({
  page,
}) => {
  await page.goto("/about-us/");
  await expect(page).toHaveTitle("About Us | Papaya Health");
});

test("About mark has stable visible geometry", async ({ page }) => {
  await page.goto("/about-us");
  const mark = page.getByRole("img", { name: /seeds growing inside/i });
  await expect(mark).toBeVisible();

  const box = await mark.boundingBox();
  expect(box?.height).toBeGreaterThan(120);
  expect(box?.width).toBeGreaterThan(250);
});

test("unknown routes render an accessible not-found page", async ({ page }) => {
  await page.goto("/missing-page");
  await expect(page).toHaveURL(/\/missing-page$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /couldn't find that page/i }),
  ).toBeVisible();
});

test("third-party notices are linked and ship with the build", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Third-party notices" }),
  ).toHaveAttribute("href", "/THIRD_PARTY_NOTICES.txt");

  const response = await request.get("/THIRD_PARTY_NOTICES.txt");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("SIL OPEN FONT LICENSE Version 1.1");
});

test("the static host error page is accessible", async ({ page }) => {
  const response = await page.goto("/404.html", { waitUntil: "networkidle" });
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: /couldn't find that page/i }),
  ).toBeVisible();

  const brandMark = page.locator('.brand img[src="/assets/papaya-mark.svg"]');
  await expect(brandMark).toBeVisible();
  await expect
    .poll(() => brandMark.evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

import { expect, test } from "@playwright/test";

const visualCases = [
  { name: "home-390", path: "/", width: 390, height: 844 },
  { name: "home-768", path: "/", width: 768, height: 900 },
  { name: "home-1024", path: "/", width: 1024, height: 900 },
  { name: "home-1440", path: "/", width: 1440, height: 900 },
  {
    name: "who-we-serve-390",
    path: "/who-we-serve",
    width: 390,
    height: 844,
  },
  {
    name: "who-we-serve-768",
    path: "/who-we-serve",
    width: 768,
    height: 900,
  },
  {
    name: "who-we-serve-1024",
    path: "/who-we-serve",
    width: 1024,
    height: 900,
  },
  {
    name: "who-we-serve-1440",
    path: "/who-we-serve",
    width: 1440,
    height: 900,
  },
  { name: "about-390", path: "/about-us", width: 390, height: 844 },
  { name: "about-768", path: "/about-us", width: 768, height: 900 },
  { name: "about-1024", path: "/about-us", width: 1024, height: 900 },
  { name: "about-1440", path: "/about-us", width: 1440, height: 900 },
  { name: "terms-390", path: "/terms", width: 390, height: 844 },
  { name: "terms-1440", path: "/terms", width: 1440, height: 900 },
  { name: "privacy-390", path: "/privacy", width: 390, height: 844 },
  { name: "privacy-1440", path: "/privacy", width: 1440, height: 900 },
] as const;

for (const visualCase of visualCases) {
  test(`${visualCase.name} matches its reviewed full-page baseline`, async ({
    browserName,
    page,
  }) => {
    test.skip(browserName !== "chromium", "Chromium owns pixel baselines");
    await page.setViewportSize({
      width: visualCase.width,
      height: visualCase.height,
    });
    await page.goto(visualCase.path, { waitUntil: "networkidle" });
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
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));

    await expect(page).toHaveScreenshot(`${visualCase.name}.png`, {
      fullPage: true,
      maxDiffPixels: 250,
    });
  });
}

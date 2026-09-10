import { expect, test } from "@playwright/test";

const pageRoutes = ["/", "/who-we-serve", "/about-us", "/terms", "/privacy"];
const allowedPaths = new Set([...pageRoutes, "/THIRD_PARTY_NOTICES.txt"]);

function normalizedPath(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

for (const sourceRoute of pageRoutes) {
  test(`${sourceRoute} has no broken internal links or fragment targets`, async ({
    page,
  }) => {
    await page.goto(sourceRoute);
    const links = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        [
          ...new Set(
            anchors.map(
              (anchor) =>
                new URL(anchor.getAttribute("href") ?? "", document.baseURI)
                  .href,
            ),
          ),
        ].sort(),
      );

    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      const target = new URL(href);
      expect(target.origin).toBe("http://127.0.0.1:4173");
      expect(allowedPaths.has(normalizedPath(target.pathname))).toBe(true);

      const response = await page.request.get(
        `${target.origin}${target.pathname}${target.search}`,
      );
      expect(response.ok()).toBe(true);
      if (target.hash) {
        await page.goto(target.href);
        const id = decodeURIComponent(target.hash.slice(1));
        expect(
          await page.evaluate(
            (value) => Boolean(document.getElementById(value)),
            id,
          ),
        ).toBe(true);
      }
    }
  });
}

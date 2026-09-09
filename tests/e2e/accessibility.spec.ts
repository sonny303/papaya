import { expect, test, type Locator, type Page } from "@playwright/test";

const publicRoutes = [
  { name: "home", path: "/", primaryActionCount: 6 },
  { name: "who-we-serve", path: "/who-we-serve", primaryActionCount: 0 },
  { name: "about", path: "/about-us", primaryActionCount: 0 },
  { name: "terms", path: "/terms", primaryActionCount: 0 },
  { name: "privacy", path: "/privacy", primaryActionCount: 0 },
] as const;
const requiredWidths = [320, 390, 768, 1024, 1440] as const;
const primaryActions = [
  {
    id: "hero-patient",
    source: "/",
    scope: 'section[aria-labelledby="hero-heading"]',
    name: "Join the waitlist",
    destination: "/who-we-serve#patients",
    focusTarget: "#patients",
  },
  {
    id: "hero-clinic",
    source: "/",
    scope: 'section[aria-labelledby="hero-heading"]',
    name: "Explore a clinic pilot",
    destination: "/who-we-serve#clinics",
    focusTarget: "#clinics",
  },
  {
    id: "audience-patient",
    source: "/",
    scope: 'section[aria-labelledby="audience-heading"]',
    name: "Learn more for patients",
    destination: "/who-we-serve#patients",
    focusTarget: "#patients",
  },
  {
    id: "audience-partner",
    source: "/",
    scope: 'section[aria-labelledby="audience-heading"]',
    name: "Learn more for partners",
    destination: "/who-we-serve#partners",
    focusTarget: "#partners",
  },
  {
    id: "audience-clinic",
    source: "/",
    scope: 'section[aria-labelledby="audience-heading"]',
    name: "Learn more for clinics",
    destination: "/who-we-serve#clinics",
    focusTarget: "#clinics",
  },
  {
    id: "first-step-patient",
    source: "/",
    scope: 'section[aria-labelledby="first-step-heading"]',
    name: "Join the waitlist",
    destination: "/who-we-serve#patients",
    focusTarget: "#patients",
  },
  {
    id: "not-found-home",
    source: "/missing-page",
    scope: "main",
    name: "Return home",
    destination: "/",
    focusTarget: "main",
  },
] as const;

type PrimaryAction = (typeof primaryActions)[number];

function actionLocator(page: Page, action: PrimaryAction) {
  return page
    .locator(action.scope)
    .getByRole("link", { name: action.name, exact: true });
}

async function assertUsableLayout(page: Page, context: string) {
  const findings = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const visibleTextElements = Array.from(
      document.querySelectorAll<HTMLElement>("h1, h2, h3, p, a, button"),
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        bounds.width > 0 &&
        bounds.height > 0
      );
    });

    return {
      documentOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      clippedOrOffscreenText: visibleTextElements
        .filter((element) => {
          const bounds = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const clipsInline = ["clip", "hidden"].includes(style.overflowX);
          const clipsBlock = ["clip", "hidden"].includes(style.overflowY);
          return (
            (clipsInline && element.scrollWidth > element.clientWidth + 1) ||
            (clipsBlock && element.scrollHeight > element.clientHeight + 1) ||
            bounds.left < -1 ||
            bounds.right > viewportWidth + 1
          );
        })
        .map((element) => element.textContent?.trim().slice(0, 80)),
    };
  });

  expect(findings.documentOverflow, `${context}: document overflow`).toBe(
    false,
  );
  expect(
    findings.clippedOrOffscreenText,
    `${context}: clipped or offscreen text`,
  ).toEqual([]);
}

async function assertActionGeometry(
  action: Locator,
  actionName: string,
  width: number,
) {
  await expect(action).toHaveCount(1);
  await expect(action).toBeVisible();
  await action.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );

  const geometry = await action.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const hitTarget = document.elementFromPoint(centerX, centerY);
    return {
      height: bounds.height,
      width: bounds.width,
      withinViewport:
        bounds.left >= 0 &&
        bounds.right <= window.innerWidth &&
        bounds.top >= 0 &&
        bounds.bottom <= window.innerHeight,
      hitTarget:
        hitTarget === element ||
        (hitTarget !== null && element.contains(hitTarget)),
    };
  });

  expect(
    geometry.width,
    `${actionName} width at ${width}px`,
  ).toBeGreaterThanOrEqual(44);
  expect(
    geometry.height,
    `${actionName} height at ${width}px`,
  ).toBeGreaterThanOrEqual(44);
  expect(
    geometry.withinViewport,
    `${actionName} viewport containment at ${width}px`,
  ).toBe(true);
  expect(
    geometry.hitTarget,
    `${actionName} pointer hit target at ${width}px`,
  ).toBe(true);
}

async function expectDestination(page: Page, action: PrimaryAction) {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.hash}`;
    })
    .toBe(action.destination);
  await expect(page.locator(action.focusTarget)).toBeFocused();
}

async function focusWithTab(page: Page, target: Locator) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => document.activeElement === element)
    ) {
      return;
    }
  }
  throw new Error("Action was not reachable within 30 Tab presses.");
}

for (const route of publicRoutes) {
  for (const width of requiredWidths) {
    test(`${route.name} is usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path, { waitUntil: "networkidle" });
      await expect(page.locator("main .p-button")).toHaveCount(
        route.primaryActionCount,
      );
      await assertUsableLayout(page, `${route.path} at ${width}px`);
    });
  }
}

for (const width of requiredWidths) {
  test(`all required primary actions have usable geometry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const source of ["/", "/missing-page"]) {
      await page.goto(source, { waitUntil: "networkidle" });
      await page.addStyleTag({
        content: "html { scroll-behavior: auto !important; }",
      });
      const expectedCount = source === "/" ? 6 : 1;
      await expect(page.locator("main .p-button")).toHaveCount(expectedCount);
      for (const action of primaryActions.filter(
        (candidate) => candidate.source === source,
      )) {
        await assertActionGeometry(
          actionLocator(page, action),
          action.id,
          width,
        );
      }
    }
  });
}

for (const action of primaryActions) {
  test(`${action.id} is pointer- and keyboard-operable`, async ({
    browserName,
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(action.source, { waitUntil: "networkidle" });
    await actionLocator(page, action).click();
    await expectDestination(page, action);

    await page.goto(action.source, { waitUntil: "networkidle" });
    const keyboardAction = actionLocator(page, action);
    if (browserName === "webkit") {
      await keyboardAction.focus();
    } else {
      await focusWithTab(page, keyboardAction);
    }
    await expect(keyboardAction).toBeFocused();
    await page.keyboard.press("Enter");
    await expectDestination(page, action);
  });
}

test("keyboard navigation exposes skip and desktop-header focus", async ({
  browserName,
  page,
}) => {
  test.skip(
    browserName === "webkit",
    "Linux WebKit is not evidence of macOS Safari keyboard preferences",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  await page.goto("/", { waitUntil: "networkidle" });
  const expectedOrder = [
    page.locator("header").getByRole("link", { name: "Papaya Health home" }),
    page.locator("header").getByRole("link", { name: "Our Solutions" }),
    page.locator("header").getByRole("link", { name: "Who We Serve" }),
    page.locator("header").getByRole("link", { name: "About Us" }),
  ];
  await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  for (const target of expectedOrder) {
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
  }
  expect(
    await expectedOrder
      .at(-1)
      ?.evaluate((element) => window.getComputedStyle(element).boxShadow),
  ).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/about-us$/);
  await expect(page.locator("main")).toBeFocused();
});

test("reduced-motion preference suppresses repeating seed animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/about-us");

  const seed = page.locator("circle.papaya-seed").first();
  await expect(seed).toBeVisible();
  await expect
    .poll(() =>
      seed.evaluate((element) => {
        const style = window.getComputedStyle(element);
        return (
          Number.parseFloat(style.animationDuration) <= 0.001 &&
          style.animationIterationCount === "1" &&
          style.opacity === "0.8"
        );
      }),
    )
    .toBe(true);
});

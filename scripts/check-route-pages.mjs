import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  generateRoutePages,
  normalizeSiteOrigin,
} from "./generate-route-pages.mjs";

const root = process.cwd();
const outputDirectory = join(root, "dist");
const routes = ["/", "/who-we-serve", "/about-us", "/terms", "/privacy"];
const indexableRoutes = new Set(["/", "/who-we-serve", "/about-us"]);

function outputName(route) {
  return route === "/" ? "index.html" : `${route.slice(1)}.html`;
}

function attribute(html, selector, attributeName) {
  const expression = new RegExp(
    `<${selector}[^>]*${attributeName}="([^"]+)"[^>]*>`,
  );
  return html.match(expression)?.[1] ?? null;
}

async function validatePreviewPages(directory = outputDirectory) {
  const titles = new Set();
  const descriptions = new Set();

  for (const route of routes) {
    const html = await readFile(join(directory, outputName(route)), "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = attribute(html, 'meta name="description"', "content");
    const robots = attribute(html, 'meta name="robots"', "content");
    const openGraphTitle = attribute(
      html,
      'meta property="og:title"',
      "content",
    );
    const openGraphDescription = attribute(
      html,
      'meta property="og:description"',
      "content",
    );
    const twitterTitle = attribute(
      html,
      'meta name="twitter:title"',
      "content",
    );
    const twitterDescription = attribute(
      html,
      'meta name="twitter:description"',
      "content",
    );

    if (!title || !description)
      throw new Error(`${route} lacks route metadata`);
    if (titles.has(title) || descriptions.has(description)) {
      throw new Error(`${route} duplicates route metadata`);
    }
    if (robots !== "noindex,follow") {
      throw new Error(`${route} is not preview-safe`);
    }
    if (
      openGraphTitle !== title ||
      openGraphDescription !== description ||
      twitterTitle !== title ||
      twitterDescription !== description
    ) {
      throw new Error(`${route} has inconsistent social metadata`);
    }
    if (html.includes('rel="canonical"')) {
      throw new Error(`${route} exposes a preview canonical URL`);
    }
    for (const productionOnlyTag of [
      'name="papaya-site-origin"',
      'property="og:url"',
      'property="og:image"',
      'name="twitter:image"',
    ]) {
      if (html.includes(productionOnlyTag)) {
        throw new Error(`${route} exposes ${productionOnlyTag} in preview`);
      }
    }

    titles.add(title);
    descriptions.add(description);
  }

  const robots = await readFile(join(directory, "robots.txt"), "utf8");
  if (robots !== "User-agent: *\nDisallow: /\n") {
    throw new Error("preview robots.txt does not disallow crawling");
  }
  const sitemap = await readFile(join(directory, "sitemap.xml"), "utf8");
  if (sitemap.includes("<url>")) {
    throw new Error("preview sitemap must not publish routes");
  }
}

async function validatePreviewWithConfiguredOrigin() {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "papaya-preview-seo-"));
  try {
    await cp(outputDirectory, fixtureDirectory, { recursive: true });
    await generateRoutePages({
      outputDirectory: fixtureDirectory,
      siteOrigin: "https://papaya.example",
      deploymentEnvironment: "preview",
    });
    await validatePreviewPages(fixtureDirectory);
  } finally {
    await rm(fixtureDirectory, { force: true, recursive: true });
  }
}

async function validateProductionFixture() {
  const fixtureDirectory = await mkdtemp(join(tmpdir(), "papaya-seo-"));
  try {
    await cp(outputDirectory, fixtureDirectory, { recursive: true });
    await generateRoutePages({
      outputDirectory: fixtureDirectory,
      siteOrigin: "https://papaya.example",
      deploymentEnvironment: "production",
    });

    for (const route of routes) {
      const html = await readFile(
        join(fixtureDirectory, outputName(route)),
        "utf8",
      );
      const expectedCanonical = `https://papaya.example${route}`;
      const canonical = attribute(html, 'link rel="canonical"', "href");
      const robots = attribute(html, 'meta name="robots"', "content");
      const openGraphUrl = attribute(html, 'meta property="og:url"', "content");
      const openGraphImage = attribute(
        html,
        'meta property="og:image"',
        "content",
      );
      const twitterImage = attribute(
        html,
        'meta name="twitter:image"',
        "content",
      );

      if (canonical !== expectedCanonical) {
        throw new Error(`${route} has an invalid production canonical`);
      }
      if (openGraphUrl !== expectedCanonical) {
        throw new Error(`${route} has an invalid Open Graph URL`);
      }
      if (
        openGraphImage !==
          "https://papaya.example/assets/couple-planning.jpg" ||
        twitterImage !== openGraphImage
      ) {
        throw new Error(`${route} has invalid production social imagery`);
      }
      if (
        robots !==
        (indexableRoutes.has(route) ? "index,follow" : "noindex,follow")
      ) {
        throw new Error(`${route} has an invalid production robots policy`);
      }
    }

    const sitemap = await readFile(
      join(fixtureDirectory, "sitemap.xml"),
      "utf8",
    );
    const robots = await readFile(join(fixtureDirectory, "robots.txt"), "utf8");
    if (
      robots !==
      "User-agent: *\nAllow: /\nSitemap: https://papaya.example/sitemap.xml\n"
    ) {
      throw new Error("production robots.txt is invalid");
    }
    for (const route of indexableRoutes) {
      if (!sitemap.includes(`<loc>https://papaya.example${route}</loc>`)) {
        throw new Error(`${route} is missing from the production sitemap`);
      }
    }
    for (const route of routes.filter((route) => !indexableRoutes.has(route))) {
      if (sitemap.includes(`<loc>https://papaya.example${route}</loc>`)) {
        throw new Error(`${route} must not appear in the production sitemap`);
      }
    }
    if ((sitemap.match(/<url>/g) ?? []).length !== indexableRoutes.size) {
      throw new Error("production sitemap contains unexpected routes");
    }
  } finally {
    await rm(fixtureDirectory, { force: true, recursive: true });
  }
}

function validateOriginRules() {
  const credentialOrigin = new URL("https://papaya.example");
  credentialOrigin.username = "user";
  credentialOrigin.password = "password";
  for (const invalidOrigin of [
    "http://papaya.example",
    credentialOrigin.href,
    "https://papaya.example/path",
    "https://papaya.example?query=value",
    "https://papaya.example/#fragment",
  ]) {
    try {
      normalizeSiteOrigin(invalidOrigin);
      throw new Error("invalid origin was accepted");
    } catch (error) {
      if (error.message === "invalid origin was accepted") throw error;
    }
  }
}

validateOriginRules();
await validatePreviewPages();
await validatePreviewWithConfiguredOrigin();
await validateProductionFixture();
console.log("Route metadata passed preview and production-mode checks.");

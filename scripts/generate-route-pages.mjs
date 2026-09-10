import { readFile, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const metadataPath = new URL(
  "../src/data/route-metadata.json",
  import.meta.url,
);
const routeMetadata = JSON.parse(await readFile(metadataPath, "utf8"));
const metadataBlockPattern =
  /\n?\s*<!-- papaya-route-meta:start -->[\s\S]*?<!-- papaya-route-meta:end -->\n?/;

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function normalizeSiteOrigin(value) {
  if (!value) return null;

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "PUBLIC_SITE_ORIGIN must be a public HTTPS origin without credentials, path, query, or fragment.",
    );
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const labels = hostname.split(".");
  const reservedSuffixes = new Set([
    "alt",
    "arpa",
    "example",
    "internal",
    "invalid",
    "local",
    "localhost",
    "onion",
    "test",
  ]);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    hostname.length > 253 ||
    !hostname.includes(".") ||
    hostname.endsWith(".") ||
    isIP(hostname) !== 0 ||
    reservedSuffixes.has(labels.at(-1)) ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error(
      "PUBLIC_SITE_ORIGIN must be a public HTTPS origin without credentials, path, query, or fragment.",
    );
  }

  return url.origin;
}

function renderMetadataBlock(route, metadata, siteOrigin) {
  const canonical = siteOrigin ? new URL(route, siteOrigin).href : null;
  const image = siteOrigin
    ? new URL("/assets/couple-planning.jpg", siteOrigin).href
    : null;
  const robots =
    metadata.indexable && siteOrigin ? "index,follow" : "noindex,follow";
  const tags = [
    "<!-- papaya-route-meta:start -->",
    `<meta name="robots" content="${robots}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Papaya Health" />`,
    `<meta property="og:title" content="${escapeAttribute(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(metadata.description)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeAttribute(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(metadata.description)}" />`,
  ];

  if (canonical) {
    tags.push(
      `<meta name="papaya-site-origin" content="${escapeAttribute(siteOrigin)}" />`,
      `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
      `<meta property="og:url" content="${escapeAttribute(canonical)}" />`,
      `<meta property="og:image" content="${escapeAttribute(image)}" />`,
      `<meta property="og:image:width" content="1448" />`,
      `<meta property="og:image:height" content="1086" />`,
      `<meta property="og:image:alt" content="Two partners making plans together at home" />`,
      `<meta name="twitter:image" content="${escapeAttribute(image)}" />`,
      `<meta name="twitter:image:alt" content="Two partners making plans together at home" />`,
    );
  }

  tags.push("<!-- papaya-route-meta:end -->");
  return tags.join("\n    ");
}

function renderRoutePage(template, route, metadata, siteOrigin) {
  const cleanTemplate = template.replace(metadataBlockPattern, "\n");
  const withTitle = cleanTemplate.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeAttribute(metadata.title)}</title>`,
  );
  const withDescription = withTitle.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeAttribute(metadata.description)}" />`,
  );

  return withDescription.replace(
    "  </head>",
    `    ${renderMetadataBlock(route, metadata, siteOrigin)}\n  </head>`,
  );
}

export async function generateRoutePages({
  outputDirectory = join(process.cwd(), "dist"),
  siteOrigin: rawSiteOrigin = process.env.PUBLIC_SITE_ORIGIN,
  deploymentEnvironment = process.env.PAPAYA_DEPLOYMENT_ENV,
} = {}) {
  const siteOrigin = normalizeSiteOrigin(rawSiteOrigin);
  const isProduction = deploymentEnvironment === "production";
  if (isProduction && !siteOrigin) {
    throw new Error(
      "Production metadata requires the non-secret PUBLIC_SITE_ORIGIN setting.",
    );
  }
  const publishedOrigin = isProduction ? siteOrigin : null;

  const template = await readFile(join(outputDirectory, "index.html"), "utf8");
  const indexableUrls = [];

  for (const [route, metadata] of Object.entries(routeMetadata)) {
    const outputName = route === "/" ? "index.html" : `${route.slice(1)}.html`;
    await writeFile(
      join(outputDirectory, outputName),
      renderRoutePage(template, route, metadata, publishedOrigin),
    );

    if (publishedOrigin && metadata.indexable) {
      indexableUrls.push(new URL(route, publishedOrigin).href);
    }
  }

  const robots = publishedOrigin
    ? `User-agent: *\nAllow: /\nSitemap: ${publishedOrigin}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  await writeFile(join(outputDirectory, "robots.txt"), robots);

  const sitemapEntries = indexableUrls
    .map((url) => `  <url><loc>${escapeAttribute(url)}</loc></url>`)
    .join("\n");
  await writeFile(
    join(outputDirectory, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
  );

  console.log(
    `Generated ${Object.keys(routeMetadata).length} route pages in ${publishedOrigin ? "indexable" : "preview-safe"} mode.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateRoutePages();
}

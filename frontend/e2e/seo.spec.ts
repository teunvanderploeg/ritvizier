import { test, expect } from "@playwright/test";

test("crawl discovery lists canonical pages with distinct search metadata", async ({
  page,
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("xml");
  const xml = await response.text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  expect(urls.map((url) => new URL(url).pathname).sort()).toEqual(
    ["/", "/aanbod", "/kosten", "/over", "/privacy", "/vergelijken"].sort(),
  );
  expect(xml).not.toMatch(/<lastmod>|\/opgeslagen|\/auto\/|\/api\//);
  const origin = new URL(urls[0]).origin;

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  const robots = await robotsResponse.text();
  expect(robots).toContain("User-Agent: *");
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
  expect(robots).not.toMatch(/Disallow: \/(auto|opgeslagen|_next)/);

  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const url of urls) {
    // Query parameters must not change a page's canonical URL.
    await page.goto(`${new URL(url).pathname}?utm_source=seo-check`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      url.replace(/\/$/, ""),
    );
    const title = await page.title();
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(title).toContain("RitVizier");
    expect(description?.length).toBeGreaterThan(50);
    expect(titles.has(title)).toBe(false);
    expect(descriptions.has(description!)).toBe(false);
    titles.add(title);
    descriptions.add(description!);
  }

  await page.goto("/opgeslagen");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("vehicle search metadata uses real vehicle data and a normalized canonical", async ({
  page,
  request,
}) => {
  const response = await request.get("/auto/g921gs", {
    headers: { "User-Agent": "Googlebot" },
  });
  expect(response.status()).toBe(200);
  // Verify metadata is server-rendered for crawlers, before JavaScript runs.
  const html = await response.text();
  expect(html).toMatch(
    /<meta name="description" content="[^"]*Mini[^"]*G-921-GS/,
  );

  await page.goto("/auto/g921gs");
  await expect(page).toHaveTitle(/Mini Countryman Cooper G-921-GS/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Mini Countryman Cooper \(G-921-GS\).*APK/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/auto\/G-921-GS$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
});

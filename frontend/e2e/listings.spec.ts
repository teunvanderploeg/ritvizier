import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const offer = {
  source: "Testbron A",
  sourceId: "test-1",
  url: "https://example.org/car/1",
  make: "MINI",
  model: "Countryman",
  year: 2021,
  price: 24000,
  mileage: 52000,
  fuel: "Benzine",
  transmission: "Automaat",
  trim: "Cooper",
  color: "Groen",
  seller: "Testdealer",
  location: "Utrecht",
  observedAt: "2026-10-08T09:00:00Z",
};
const results = {
  available: true,
  reason: null,
  updatedAt: offer.observedAt,
  total: 1,
  advertCount: 2,
  page: 1,
  pageSize: 24,
  warnings: [],
  groups: [
    {
      id: "test",
      listing: offer,
      matchReasons: ["Gelijk kenteken"],
      offers: [
        offer,
        { ...offer, source: "Testbron B", sourceId: "test-2", price: 23500 },
      ],
    },
  ],
};

test("listing search groups sources and fits desktop and small phone", async ({
  page,
}) => {
  let requestUrl = "";
  await page.route("**/api/listings?**", (route) => {
    requestUrl = route.request().url();
    return route.fulfill({ json: results });
  });
  await mkdir(join(process.cwd(), "..", "artifacts", "listings"), {
    recursive: true,
  });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto("/aanbod");
    await page.getByLabel("Merk", { exact: true }).fill("MINI");
    await page.getByLabel("Maximale kilometerstand").fill("60000");
    await page.getByRole("button", { name: "Zoek aanbod" }).click();
    await expect(page.getByRole("status")).toContainText(
      "1 auto uit 2 advertenties",
    );
    expect(requestUrl).toContain("make=MINI");
    expect(requestUrl).toContain("mileage_max=60000");
    await expect(page.locator(".listing-card")).toHaveCount(1);
    await page.getByText("2 bronadvertenties", { exact: true }).click();
    await expect(
      page.getByRole("link", { name: /Bekijk op Testbron/ }),
    ).toHaveCount(2);
    await expect(page.locator(".listing-sources")).toContainText("23.500");
    await expect(
      page
        .locator(".listing-card dt")
        .filter({ hasText: "Bouwjaar" })
        .locator("+ dd"),
    ).toHaveText("2021");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator(".skip-link")
        .evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(0);
    await page.screenshot({
      path: join(
        process.cwd(),
        "..",
        "artifacts",
        "listings",
        `${test.info().project.name}-${width}.png`,
      ),
      fullPage: true,
      style: ".skip-link:not(:focus) { visibility: hidden; }",
    });
  }
});

test("similar listings prefill official vehicle details and handle unavailable source", async ({
  page,
}) => {
  await page.goto("/auto/G-921-GS");
  await page
    .getByRole("button", { name: "Vergelijkbaar aanbod", exact: true })
    .click();
  await expect(page.getByLabel("Merk", { exact: true })).toHaveValue("MINI");
  await expect(page.getByLabel("Vanaf bouwjaar")).not.toHaveValue("");
  await page.getByRole("button", { name: "Zoek aanbod" }).click();
  await expect(
    page.getByRole("heading", { name: "Aanbod niet beschikbaar" }),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(0);
});

test("search handles empty results, unsafe data and retry", async ({
  page,
}) => {
  await page.goto("/aanbod");
  await page.route("**/api/listings?**", (route) =>
    route.fulfill({
      json: { ...results, groups: [], total: 0, advertCount: 0 },
    }),
  );
  await page.getByRole("button", { name: "Zoek aanbod" }).click();
  await expect(
    page.getByText("Geen passend aanbod. Probeer ruimere filters."),
  ).toBeVisible();
  await page.route("**/api/listings?**", (route) =>
    route.fulfill({
      json: {
        ...results,
        groups: [
          {
            ...results.groups[0],
            listing: { ...offer, url: "javascript:alert(1)" },
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Zoek aanbod" }).click();
  await expect(page.locator(".listing-search").getByRole("alert")).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(0);
  await page.route("**/api/listings?**", (route) =>
    route.fulfill({ json: results }),
  );
  await page.getByRole("button", { name: "Zoek aanbod" }).click();
  await expect(page.locator(".listing-card")).toHaveCount(1);
});

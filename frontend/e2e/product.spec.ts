import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
const artifacts = join(process.cwd(), "..", "artifacts");

test("shares a stable vehicle URL through the clipboard fallback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) => {
          sessionStorage.setItem("test:shared-url", value);
        },
      },
      configurable: true,
    });
  });
  await page.goto("/auto/GZS-88-X");
  await page.getByRole("button", { name: "Voertuig delen" }).click();
  await expect(page.getByRole("status")).toContainText("Link gekopieerd");
  expect(
    await page.evaluate(() => sessionStorage.getItem("test:shared-url")),
  ).toMatch(/\/auto\/GZS-88-X$/);
});

test("unknown and invalid vehicle pages show an error and stay unindexed", async ({
  page,
}) => {
  for (const [plate, message] of [
    ["AB-123-C", "geen voertuig"],
    ["BAD", "Dit kenteken lijkt niet geldig"],
  ]) {
    await page.goto(`/auto/${plate}`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      message,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(
      page.getByRole("button", { name: "Opnieuw proberen" }),
    ).toBeVisible();
  }
});

test("validates and clears a plate without navigation", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Kenteken", exact: true })
    .fill("BAD");
  await page
    .getByRole("button", { name: "Kenteken controleren", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Dit kenteken lijkt niet geldig",
  );
  await page.getByRole("button", { name: "Kenteken wissen" }).click();
  await expect(
    page.getByRole("textbox", { name: "Kenteken", exact: true }),
  ).toHaveValue("");
  await expect(page).toHaveURL(/\/$/);
});

test("vehicle lookup, local favourites, recent history and second lookup", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Kenteken", exact: true })
    .fill("gzs 88 x");
  await page
    .getByRole("textbox", { name: "Kenteken", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(/\/auto\/GZS-88-X$/);
  await expect(
    page.getByRole("heading", { name: "Golf", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("RDW Open Data", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Auto opslaan", exact: true }).click();
  await page.goto("/opgeslagen");
  await expect(
    page.getByRole("heading", { name: "Golf", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Recent bekeken/ }).click();
  await expect(
    page.getByRole("link", { name: "Bekijk voertuig" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Bekijk voertuig" }).click();
  await page
    .getByRole("textbox", { name: "Kenteken", exact: true })
    .fill("p185bh");
  await page.getByRole("button", { name: "Zoeken", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Toyota Yaris Cross", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auto\/P-185-BH$/);
});

test("compares two vehicles and removes one", async ({ page }) => {
  await page.goto("/vergelijken");
  for (const plate of ["GZS88X", "P185BH"]) {
    await page
      .getByRole("textbox", { name: "Kenteken voor vergelijking" })
      .fill(plate);
    await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Kenteken voor vergelijking" }),
    ).toHaveValue("");
  }
  await expect(page.getByText("2 van 3 auto’s", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Golf", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Toyota Yaris Cross", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Kenteken voor vergelijking" })
    .fill("GZS88X");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "staat al",
  );
  await page
    .getByRole("button", { name: "Verwijder GZS-88-X uit vergelijking" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Golf", exact: true }),
  ).toHaveCount(0);
});

test("cost inputs update the estimate through FastAPI", async ({ page }) => {
  await page.goto("/kosten");
  await expect(page.locator(".cost-total")).toContainText("€");
  await page.getByLabel("Exacte jaarkilometers").fill("12000");
  await page.getByLabel("Verbruik per 100 km").fill("6");
  await page.getByLabel("Brandstofprijs per liter").fill("2");
  await page.getByLabel("Verzekering per maand").fill("60");
  await page.getByLabel("Onderhoud per maand").fill("40");
  await page.getByLabel("Wegenbelasting per maand").fill("50");
  await expect(page.locator(".cost-total")).toContainText("270");
  await expect(page.locator(".cost-result>p")).toContainText("3.240");
});

test("persists dark mode and supports the system setting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kleurthema kiezen" }).click();
  await page.getByRole("button", { name: "Donker", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({
    path: join(artifacts, `dark-${test.info().project.name}.png`),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Kleurthema kiezen" }).click();
  await page.getByRole("button", { name: "Systeem", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Kleurthema kiezen" }),
  ).toBeVisible();
});

test("handles missing, incomplete and unavailable comparison data", async ({
  page,
}) => {
  await page.goto("/vergelijken");
  await page.route("**/api/vehicles/AB123C", (route) =>
    route.fulfill({
      status: 404,
      json: { detail: "We konden geen voertuig vinden voor dit kenteken." },
    }),
  );
  await page
    .getByRole("textbox", { name: "Kenteken voor vergelijking" })
    .fill("AB123C");
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "geen voertuig",
  );
  await page.route("**/api/vehicles/AB123C", (route) =>
    route.fulfill({
      status: 503,
      json: {
        detail:
          "De voertuiggegevens zijn tijdelijk niet beschikbaar. Probeer het zo opnieuw.",
      },
    }),
  );
  await page.getByRole("button", { name: "Toevoegen", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "tijdelijk niet beschikbaar",
  );
});

test("layout fits the requested viewport matrix", async ({ page }) => {
  await mkdir(artifacts, { recursive: true });
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/kosten", "/vergelijken", "/opgeslagen"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(dimensions.scroll, `${route} at ${width}px`).toBeLessThanOrEqual(
        dimensions.client,
      );
    }
    await page.goto("/");
    if ([320, 390, 768, 1440].includes(width))
      await page.screenshot({
        path: join(artifacts, `home-${width}-${test.info().project.name}.png`),
        fullPage: true,
      });
  }
});

test("vehicle detail tabs fit mobile and preserve missing values", async ({
  page,
}) => {
  await page.goto("/auto/GZS-88-X");
  await expect(
    page.getByRole("heading", { name: "Golf", exact: true }),
  ).toBeVisible();
  for (const tab of [
    "APK & registratie",
    "Motor & prestaties",
    "Verbruik & milieu",
    "Afmetingen & gewicht",
    "Praktisch",
    "Kosten",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("button", { name: tab, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    if (tab === "Verbruik & milieu") {
      await expect(
        page
          .locator(".data-row")
          .filter({ has: page.getByText("Brandstofverbruik", { exact: true }) })
          .getByRole("definition"),
      ).toHaveText("Niet beschikbaar");
    }
    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  }
  await page.getByRole("button", { name: "Overzicht", exact: true }).click();
  await page.screenshot({
    path: join(artifacts, `vehicle-${test.info().project.name}.png`),
    fullPage: true,
  });
});

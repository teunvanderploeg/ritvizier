import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
const artifacts = join(process.cwd(), "..", "artifacts");

test("tab transitions respect the reduced motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/auto/G-921-GS");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Tellerstand & historie", exact: true })
    .click();
  const panel = page.locator(".vehicle-tab-content");
  expect(
    await panel.evaluate((element) =>
      parseFloat(getComputedStyle(element).animationDuration),
    ),
  ).toBeGreaterThan(0);
  await mkdir(artifacts, { recursive: true });
  await panel.screenshot({
    path: join(artifacts, `registration-year-${test.info().project.name}.png`),
    animations: "disabled",
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Uitvoering", exact: true })
    .click();
  await expect(page.getByText("DAW500L0", { exact: true })).toBeVisible();
  expect(
    await panel.evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

test("recall details distinguish open actions from repairs reported by the producer", async ({
  page,
}) => {
  const snapshots = JSON.parse(
    await readFile(
      join(
        process.cwd(),
        "..",
        "backend",
        "tests",
        "fixtures",
        "vehicles.json",
      ),
      "utf8",
    ),
  );
  const action = {
    reference: "TEST-OPEN",
    statusCode: "O",
    status: "Openstaande terugroepactie",
    publicationDate: "2026-01-15",
    producer: "Testproducent",
    producerReference: "TEST",
    defect: "Defect uit testscenario",
    consequences: "Gevolg uit testscenario",
    remedy: "Herstel door merkdealer",
    risks: ["Risico uit testscenario"],
    phone: null,
    url: "javascript:alert(1)",
  };
  await page.route("**/api/vehicles/AB-123-C", (route) =>
    route.fulfill({
      json: {
        ...snapshots.G921GS,
        licensePlate: "AB123C",
        recallPending: true,
        recalls: [
          action,
          {
            ...action,
            reference: "TEST-REPAIRED",
            statusCode: "P",
            status: "Producent heeft herstel gemeld",
          },
        ],
      },
    }),
  );
  await page.goto("/auto/AB-123-C");
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Terugroepacties", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Er staat een terugroepactie open" }),
  ).toBeVisible();
  await expect(page.locator(".recall-card")).toHaveCount(2);
  await expect(page.locator(".recall-card").first()).toContainText(
    "Defect uit testscenario",
  );
  await expect(page.locator(".recall-card").last()).toContainText(
    "Producent heeft herstel gemeld",
  );
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test("MINI exposes RDW history, exact execution, emissions and automatic provincial road tax", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/auto/G-921-GS");
  await expect(page.getByText("Groen / Zwart", { exact: true })).toBeVisible();
  await expect(page.getByText("DAW500L0", { exact: true })).toBeVisible();
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Uitvoering", exact: true })
    .click();
  await expect(page.getByText("Automaat", { exact: true })).toBeVisible();
  await expect(
    page.locator(".data-row").filter({ hasText: "Aantal versnellingen" }),
  ).toContainText("7");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Tellerstand & historie", exact: true })
    .click();
  await expect(
    page.getByText(/De geregistreerde tellerstand is steeds hoger/),
  ).toBeVisible();
  await expect(
    page
      .locator(".data-row")
      .filter({ hasText: "Jaar laatste registratie" })
      .locator("dd"),
  ).toHaveText("2026");
  await expect(
    page.locator(".data-row").filter({ hasText: "Exacte kilometerstand" }),
  ).toContainText("Niet openbaar beschikbaar");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Terugroepacties", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Geen openstaande terugroepactie gemeld",
    }),
  ).toBeVisible();
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Verbruik & milieu", exact: true })
    .click();
  await expect(
    page.locator(".data-row").filter({ hasText: "CO₂ WLTP" }),
  ).toContainText("157 g/km");
  await expect(
    page.locator(".data-row").filter({ hasText: "CO₂ NEDC" }),
  ).toContainText("122 g/km");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Kosten", exact: true })
    .click();
  await expect(page.locator(".tax-incomplete")).toContainText(
    "zonder wegenbelasting",
  );
  await expect(page.getByLabel("Verbruik per 100 km")).toHaveValue("6.9");
  await page.getByLabel("Woonprovincie").selectOption("NH");
  await expect(page.locator(".road-tax-amount")).toContainText("226");
  await expect(page.locator(".cost-breakdown")).toContainText("75,33");
  await expect(page.locator(".tax-incomplete")).toHaveCount(0);
  await page.getByLabel("Woonprovincie").selectOption("ZH");
  await expect(page.locator(".road-tax-amount")).toContainText("247");
  await expect(page.locator(".cost-breakdown")).toContainText("82,33");
  await expect(page.getByLabel("Wegenbelasting per maand")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: join(artifacts, `mini-tax-${test.info().project.name}.png`),
    fullPage: true,
  });
  await page.getByLabel("Woonprovincie").selectOption("");
  await expect(page.locator(".tax-incomplete")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Zelf een bedrag voor wegenbelasting invullen",
    })
    .click();
  await page.getByLabel("Wegenbelasting per maand").fill("99");
  await expect(page.locator(".cost-breakdown")).toContainText("99,00");
});

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
    page.getByText("Open voertuigdata", { exact: true }).first(),
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
    "Tellerstand & historie",
    "Terugroepacties",
    "Uitvoering",
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
          .filter({
            has: page.getByText("Brandstofverbruik NEDC", { exact: true }),
          })
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

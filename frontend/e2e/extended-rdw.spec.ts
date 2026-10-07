import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
const artifacts = join(process.cwd(), "..", "artifacts");

test("APK history shows real notifications, official defects and cautious empty observations", async ({
  page,
}) => {
  if (test.info().project.name === "webkit-iphone")
    await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/auto/G-921-GS");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "APK-historie", exact: true })
    .click();
  const history = page.locator(".inspection-history");
  await page.locator(".source-status summary").click();
  await expect(
    page
      .locator(".source-status .data-row")
      .filter({ hasText: "Keuringsmeldingen" })
      .locator("dd"),
  ).toContainText("7 oktober 2026");
  await expect(
    history.getByRole("heading", { name: "APK- en technische historie" }),
  ).toBeVisible();
  await expect(history.locator(".inspection-event")).toHaveCount(2);
  await expect(history.locator(".history-stats dd").nth(0)).toHaveText("2");
  await expect(history.locator(".history-stats dd").nth(2)).toHaveText("3");
  await expect(
    history.getByText("15 oktober 2025", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("13 oktober 2023", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("Slijtage/beschadiging wiellager hoorbaar of voelbaar", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    history.getByText("Remslang schuurt langs enig deel", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText(/Geen gebrekrecords bij deze melding gevonden/),
  ).toBeVisible();
  await history.locator(".inspection-event").last().locator("summary").click();
  await expect(
    history.getByText("Remslang schuurt langs enig deel", { exact: true }),
  ).not.toBeVisible();
  await history.locator(".inspection-event").last().locator("summary").click();
  await expect(
    history.getByText("Remslang schuurt langs enig deel", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mkdir(artifacts, { recursive: true });
  expect(
    await page
      .locator(".skip-link")
      .evaluate((element) => element.getBoundingClientRect().bottom),
  ).toBeLessThan(0);
  await history.screenshot({
    path: join(artifacts, `apk-history-${test.info().project.name}.png`),
    animations: "disabled",
  });
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Carrosserie & assen", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Geregistreerde carrosserieën" }),
  ).toBeVisible();
  await page.locator(".technical-axes summary").first().click();
  await expect(
    page
      .locator(".technical-axes")
      .getByText("Technische maximum aslast")
      .first(),
  ).toBeVisible();
  await expect(
    page.locator(".technical-axes").getByText("1.045 kg").first(),
  ).toBeVisible();
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Tellerstand & historie", exact: true })
    .click();
  await page.getByLabel("Actuele kilometerstand").fill("128400");
  await expect(page.locator(".mileage-result")).toContainText(
    "Berekend gemiddelde",
  );
  await expect(
    page.locator(".data-row").filter({ hasText: "Exacte kilometerstand" }),
  ).toContainText("Niet openbaar beschikbaar");
});

test("possible model recalls remain separate from the plate-specific status", async ({
  page,
}) => {
  await page.goto("/auto/G-921-GS");
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Terugroepacties", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Geen openstaande terugroepactie gemeld",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mogelijke acties voor merk en model" }),
  ).toBeVisible();
  await expect(page.locator(".possible-recall-card")).toHaveCount(5);
  await expect(page.locator(".possible-recalls")).toContainText(
    "niet als open actie aan dit kenteken gekoppeld",
  );
  await page.locator(".possible-recall-card summary").first().click();
  await expect(page.locator(".possible-recall-body").first()).toBeVisible();
  await expect(page.locator(".recall-summary")).not.toContainText(
    "Er staat een terugroepactie open",
  );
});

test("partial APK data and multiple fuel records remain usable", async ({
  page,
}) => {
  const records = JSON.parse(
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
  const mini = records.G921GS;
  const fuel = mini.fuels[0];
  const response = {
    ...mini,
    licensePlate: "AB123C",
    fuelTypes: ["Benzine", "Elektriciteit"],
    fuels: [
      fuel,
      {
        ...fuel,
        sequence: 2,
        name: "Elektriciteit",
        powerKw: null,
        powerHp: null,
        electricPowerKw: 70,
        continuousPowerKw: 45,
        consumptionWltp: null,
        consumptionNedc: null,
      },
    ],
    apkHistory: {
      ...mini.apkHistory,
      notificationsAvailable: false,
      descriptionsAvailable: false,
      inspections: mini.apkHistory.inspections
        .filter((event: { defects: unknown[] }) => event.defects.length)
        .map((event: { defects: Record<string, unknown>[] }) => ({
          ...event,
          hasNotification: false,
          defects: event.defects.map((defect) => ({
            ...defect,
            description: null,
          })),
        })),
    },
    analysis: { ...mini.analysis, inspectionCount: 0 },
  };
  await page.route("**/api/vehicles/AB-123-C", (route) =>
    route.fulfill({ json: response }),
  );
  await page.goto("/auto/AB-123-C");
  await page.getByRole("button", { name: "Opnieuw proberen" }).click();
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "APK-historie", exact: true })
    .click();
  await expect(page.locator(".inspection-history")).toContainText(
    "De keuringsmeldingen zijn niet beschikbaar",
  );
  await expect(page.locator(".inspection-history")).toContainText(
    "Gebrekenmelding zonder gekoppelde keuring",
  );
  await expect(page.locator(".inspection-history")).toContainText(
    "Officiële omschrijving niet beschikbaar",
  );
  await expect(page.locator(".inspection-history")).toContainText(
    "Gebrekcode 310",
  );
  await page
    .locator(".section-tabs")
    .getByRole("button", { name: "Motor & prestaties", exact: true })
    .click();
  await expect(page.locator(".fuel-record")).toHaveCount(2);
  await expect(page.locator(".fuel-record").last()).toContainText(
    "Elektriciteit",
  );
  await expect(page.locator(".fuel-record").last()).toContainText("45 kW");
});

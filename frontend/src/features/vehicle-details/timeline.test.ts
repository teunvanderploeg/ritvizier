import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { vehicleSchema } from "../../types/vehicle";
import {
  apkStatus,
  duration,
  elapsedMonths,
  safeSourceUrl,
  vehicleColors,
} from "./timeline";

const fixtures = JSON.parse(
  readFileSync(
    new URL(
      "../../../../backend/tests/fixtures/vehicles.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const mini = vehicleSchema.parse(fixtures.G921GS);

it("keeps saved records from the older schema readable", () => {
  const old = vehicleSchema.parse(fixtures.GZS88X);
  expect(old.colorSecondary).toBe(null);
  expect(old.recalls).toEqual([]);
  expect(old.typeApproval.matched).toBe(false);
});
it("shows both registered colors", () =>
  expect(vehicleColors(mini)).toBe("Groen / Zwart"));
it("counts APK calendar days and treats the expiry date as still valid", () => {
  expect(apkStatus(mini, "2027-10-18").status).toBe("Verloopt binnenkort");
  expect(apkStatus(mini, "2027-10-18").days).toBe(0);
  expect(apkStatus(mini, "2027-10-19").status).toBe("Verlopen");
  expect(apkStatus(mini, "2027-09-18").days).toBe(30);
  expect(apkStatus({ ...mini, apkExpiryDate: null }).status).toBe(
    "Niet beschikbaar",
  );
});
it("applies the 50-year exemption only to light passenger cars", () => {
  const old = { ...mini, firstRegistrationDate: "1976-10-07", maxMassKg: 2500 };
  expect(apkStatus(old, "2026-10-06").exempt).toBe(false);
  expect(apkStatus(old, "2026-10-07").status).toBe("Niet APK-plichtig");
  expect(apkStatus({ ...old, maxMassKg: 4000 }, "2026-10-07").exempt).toBe(
    false,
  );
});
it("does not count an incomplete anniversary month", () => {
  expect(elapsedMonths("2019-10-18", "2026-10-07")).toBe(83);
  expect(duration(83)).toBe("6 jaar en 11 maanden");
  expect(elapsedMonths("2027-01-01", "2026-10-07")).toBe(null);
});
it("accepts normal source links and rejects active URL schemes", () => {
  expect(safeSourceUrl("www.rdw.nl")).toBe("https://www.rdw.nl/");
  expect(safeSourceUrl("javascript:alert(1)")).toBe(null);
  expect(safeSourceUrl("data:text/html,test")).toBe(null);
});

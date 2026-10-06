import { chromium, webkit } from "playwright";
import { expect } from "@playwright/test";

const origin = process.argv[2];
if (!origin)
  throw new Error(
    "Pass the local network URL, for example http://192.168.50.205:3000",
  );
for (const [name, engine] of [
  ["Chromium", chromium],
  ["WebKit", webkit],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(origin, { waitUntil: "networkidle" });
    const input = page.getByRole("textbox", { name: "Kenteken", exact: true });
    await expect(input).toBeEnabled({ timeout: 15000 });
    await input.fill("gzs 88 x");
    await input.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Golf", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveURL(/\/auto\/GZS-88-X$/);
    await expect(input).toBeEnabled();
    await input.fill("P185BH");
    await page.getByRole("button", { name: "Zoeken", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Toyota Yaris Cross", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    expect(errors).toEqual([]);
    console.log(
      `${name}: LAN input, lookup and a second lookup passed at ${origin}`,
    );
  } finally {
    await browser.close();
  }
}

import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
const python =
  process.env.PYTHON_EXECUTABLE ||
  (process.platform === "win32"
    ? join(process.cwd(), "..", ".venv", "Scripts", "python.exe")
    : "python");
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 12000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 13"], browserName: "webkit" },
    },
  ],
  webServer: [
    {
      command: `"${python}" -m uvicorn tests.fixture_server:app --app-dir ../backend --port 8001`,
      url: "http://localhost:8001/health",
      timeout: 30000,
    },
    {
      command: "npm run start -- --port 3100",
      url: "http://localhost:3100",
      env: { BACKEND_URL: "http://127.0.0.1:8001" },
      timeout: 120000,
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const remote = !!process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", video: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remote
    ? undefined
    : {
        command: `npx tsx scripts/seed.ts && npx next dev -p ${PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          PORT: String(PORT),
          KV_MODE: "file",
          KV_FILE: ".data/kv-e2e.json",
          SCHEDULER: process.env.E2E_SCHEDULER ?? "tick",
          CHAIN_MODE: "simulated",
          SIM_CONFIRM_MS: "500",
          FX_API_URL: "http://127.0.0.1:9",
          WORKFLOW_LOCAL_DATA_DIR: ".workflow-data-e2e",
          WORKFLOW_LOCAL_RECOVER_ACTIVE_RUNS: "0",
        },
      },
});

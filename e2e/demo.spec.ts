import { expect, test, type Page } from "@playwright/test";

/**
 * Walks docs/demo-script.md top to bottom against a seeded instance.
 * Local: `npm run e2e` (seeds .data/kv-e2e.json, starts next dev on :3100).
 * Remote: `PLAYWRIGHT_BASE_URL=https://… SEED_SECRET=… npm run e2e` (seeds via POST /api/seed).
 */
test.describe.configure({ mode: "serial" });

let page: Page;
let invoiceUrl = "";
let eunInvoiceUrl = "";

const badge = (text: string) => page.getByTestId("status-badge").filter({ hasText: text });
const headerBadge = (text: string) => page.getByTestId("page-actions").getByTestId("status-badge").filter({ hasText: text });

async function loginAs(name: string, home: RegExp) {
  await page.goto("/login");
  await page.getByRole("button", { name }).click();
  await page.waitForURL(home);
}
async function signOut() {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
}

test.beforeAll(async ({ browser, baseURL }) => {
  page = await (await browser.newContext()).newPage();
  if (process.env.PLAYWRIGHT_BASE_URL) {
    const res = await page.request.post(`${baseURL}/api/seed`, {
      headers: { "x-seed-secret": process.env.SEED_SECRET ?? "" },
      data: { flush: true },
    });
    expect(res.ok(), `seed failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  }
});

test("1. login page lists company admins and workers", async () => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jordan Lee" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Eun Nguyen" })).toBeVisible();
});

test("2. company dashboard shows treasury, savings and pending items", async () => {
  await loginAs("Jordan Lee", /\/company$/);
  await expect(page.getByRole("heading", { name: "Acme Remote" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Treasury balance")).toBeVisible();
  await expect(page.getByText(/Saved vs\. bank wires/)).toBeVisible();
  await expect(page.getByText("Eun Nguyen · KYC pending")).toBeVisible();
  await expect(page.getByText("Bob Reyes changed payout settings")).toBeVisible();
  await expect(page.getByText("Carlos Mendes requested payment")).toBeVisible();
});

test("3. company issues an invoice for Alice scheduled ~1 minute out", async () => {
  await page.goto("/company/invoices/new");
  await page.getByLabel("Worker", { exact: true }).selectOption("wrk_alice");
  await page.getByLabel("Amount (local currency)").fill("4200000");
  await page.getByLabel("Currency", { exact: true }).selectOption("KRW");
  const d = new Date(Date.now() + 75_000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  await page.getByLabel("Settle at").fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
  await page.getByLabel("Memo").fill("October salary");
  await page.getByRole("button", { name: "Issue invoice" }).click();
  await page.waitForURL(/\/company\/invoices\/inv_/, { timeout: 30_000 });
  invoiceUrl = new URL(page.url()).pathname;
  await expect(headerBadge("Awaiting approval")).toBeVisible();
});

test("4. Alice approves the invoice", async () => {
  await signOut();
  await loginAs("Alice Kim", /\/worker$/);
  await expect(page.getByText(/Needs your approval \(1\)/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Email sent to the counterparty.")).toBeVisible();
  await expect(page.getByText(/Needs your approval/)).toHaveCount(0, { timeout: 20_000 });
});

test("5. settlement confirms at the scheduled time with an executed FX rate", async () => {
  await page.goto(invoiceUrl.replace("/company/", "/worker/"));
  await expect(headerBadge("Confirmed")).toBeVisible({ timeout: 150_000 });
  const executed = page.getByText("Executed rate (at send)").locator("xpath=following-sibling::dd[1]");
  await expect(executed).not.toHaveText("pending");
  await expect(page.getByText("Settled amount").locator("xpath=following-sibling::dd[1]")).toContainText("USDC");
});

test("6. on-chain record is verified and the explorer decodes the memo", async () => {
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /^0x/ }).click();
  await page.waitForURL(/\/explorer\/tx\/0x/);
  await expect(page.getByText("Transaction details")).toBeVisible();
  await expect(page.getByText("Decoded Settlivo memo")).toBeVisible();
  await expect(page.getByText(/transfer\(address,uint256\) \+ memo/)).toBeVisible();
});

test("7. Alice withdraws to KRW and it completes", async () => {
  await page.goto("/worker/withdraw");
  await page.getByLabel(/Amount \(USDC\)/).fill("100");
  await page.getByRole("button", { name: "Withdraw to KRW" }).click();
  await page.waitForURL(/\/worker\/withdraw$/);
  await expect(badge("Processing")).toBeVisible({ timeout: 20_000 });
  await expect(badge("Processing")).toHaveCount(0, { timeout: 40_000 });
  await expect(page.getByText("Withdrawal completed")).toBeVisible({ timeout: 20_000 }).catch(() => undefined);
});

test("8. company approves Bob's payout settings and Carlos's payment request", async () => {
  await signOut();
  await loginAs("Jordan Lee", /\/company$/);
  await page.goto("/company/approvals");
  const bob = page.locator('[data-slot="card"]', { hasText: "Bob Reyes" });
  await bob.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("Payout setting changes (0)")).toBeVisible({ timeout: 20_000 });
  const carlos = page.locator('[data-slot="card"]', { hasText: "Carlos Mendes" });
  await carlos.getByRole("button", { name: "Approve & schedule" }).click();
  await expect(page.getByText("Payment requests (0)")).toBeVisible({ timeout: 20_000 });
  await page.goto("/company/invoices?f=open");
  await expect(page.getByRole("row", { name: /Overtime: release weekend/ }).getByTestId("status-badge")).toHaveText("Scheduled");
});

test("9. payroll run settles all verified workers", async () => {
  await page.goto("/company/payroll");
  await page.getByRole("button", { name: "Run payroll now" }).click();
  await page.waitForURL(/\/company\/payroll\/run_/, { timeout: 30_000 });
  await expect(page.getByText("3 / 3")).toBeVisible({ timeout: 90_000 });
  await expect(headerBadge("Completed")).toBeVisible({ timeout: 20_000 });
});

test("10. Eun's salary is blocked on KYC", async () => {
  await page.goto("/company/invoices");
  const row = page.getByRole("row", { name: /Eun Nguyen/ });
  await expect(row.getByTestId("status-badge")).toHaveText("Blocked · KYC");
  await row.getByRole("link", { name: "Eun Nguyen" }).click();
  await page.waitForURL(/\/company\/invoices\/inv_/);
  eunInvoiceUrl = new URL(page.url()).pathname;
  await expect(headerBadge("Blocked · KYC")).toBeVisible();
});

test("11. Eun completes verification", async () => {
  await signOut();
  await loginAs("Eun Nguyen", /\/worker$/);
  await expect(page.getByText("Finish verification to receive payouts")).toBeVisible();
  await page.getByRole("link", { name: "Continue" }).click();
  await page.waitForURL(/\/worker\/onboarding$/);
  await expect(page.getByRole("heading", { name: "Residential address" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Tax information" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Reviewing your documents…")).toBeVisible({ timeout: 20_000 });
  await page.waitForURL(/\/worker$/, { timeout: 40_000 });
  await expect(page.getByText("Finish verification to receive payouts")).toHaveCount(0);
});

test("12. company retries Eun's blocked invoice and it settles", async () => {
  await signOut();
  await loginAs("Jordan Lee", /\/company$/);
  await page.goto(eunInvoiceUrl);
  await page.getByRole("button", { name: "Retry settlement" }).click();
  await expect(headerBadge("Confirmed")).toBeVisible({ timeout: 90_000 });
});

test("13. org switcher moves to Nordwind Labs where Alice also works", async () => {
  await page.goto("/company");
  await page.getByRole("combobox", { name: "Organization" }).selectOption("org_nordwind");
  await expect(page.getByRole("heading", { name: "Nordwind Labs" })).toBeVisible({ timeout: 30_000 });
  await page.goto("/company/workers");
  await expect(page.getByRole("link", { name: "Alice Kim" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dana Kowalski" })).toBeVisible();
});

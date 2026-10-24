import Link from "next/link";
import { notFound } from "next/navigation";
import { computeSavings } from "@/components/dashboard/savings-widget";
import { StatCard } from "@/components/dashboard/stat-card";
import { RunProgress } from "@/components/payroll/run-progress";
import { Page } from "@/components/shell/page";
import { Money, Usdc } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { getInvoice, getPayrollRun, putPayrollRun } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

export default async function PayrollRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const s = await requireCompany();
  const { runId } = await params;
  const run = await getPayrollRun(runId);
  if (!run || run.orgId !== s.orgId) notFound();
  const { workerMap } = await companyContext(s.orgId);
  const invoices = (await Promise.all(run.invoiceIds.map(getInvoice))).filter((i) => i !== null);
  const confirmed = invoices.filter((i) => i.status === "confirmed");
  const done = invoices.every((i) => ["confirmed", "failed", "rejected"].includes(i.status));
  if (done && run.status === "running") {
    await putPayrollRun({ ...run, status: confirmed.length === invoices.length ? "completed" : "partial" });
  }
  const sv = computeSavings(confirmed);
  const status = done ? (confirmed.length === invoices.length ? "completed" : "failed") : "processing";
  const heldByPlan = invoices.some((i) => i.blockedReason === "plan");
  return (
    <Page title="Payroll run" description={`${formatDateTime(run.createdAt)} · ${invoices.length} workers · batch settlement contract`} actions={<StatusBadge status={status} />}>
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <StatCard label="Settled" value={`${confirmed.length} / ${invoices.length}`} hint={heldByPlan ? <>held by plan limit · <Link href="/company/billing" className="underline underline-offset-4 hover:text-foreground">see Billing</Link></> : done ? "complete" : "settling sequentially…"} />
        <StatCard label="Total USDC" value={<Usdc value={sv.totalUsd} />} hint="locked at send time" />
        <StatCard label="Saved vs bank wires" value={<Money amount={Math.max(0, sv.saved)} currency="USD" dp={0} />} hint={`${sv.daysSaved} business days faster`} />
      </div>
      <RunProgress invoices={invoices} workers={workerMap} />
    </Page>
  );
}

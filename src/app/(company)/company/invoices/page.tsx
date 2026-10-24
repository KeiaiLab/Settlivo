import Link from "next/link";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Page } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { InvoiceStatus } from "@/lib/domain/types";
import { companyContext } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

const FILTERS: { key: string; label: string; match: (s: InvoiceStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Open", match: (s) => ["pending_approval", "scheduled", "sending"].includes(s) },
  { key: "confirmed", label: "Confirmed", match: (s) => s === "confirmed" },
  { key: "issues", label: "Issues", match: (s) => ["failed", "rejected"].includes(s) },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const s = await requireCompany();
  const { f = "all" } = await searchParams;
  const { invoices, workerMap } = await companyContext(s.orgId);
  const filter = FILTERS.find((x) => x.key === f) ?? FILTERS[0];
  const rows = invoices.filter((i) => filter.match(i.status));
  return (
    <Page title="Invoices" description={`${invoices.length} total`} actions={<Button render={<Link href="/company/invoices/new" />}>New invoice</Button>}>
      <div className="mb-3 flex gap-1">
        {FILTERS.map((x) => (
          <Link key={x.key} href={`/company/invoices?f=${x.key}`} className={`rounded-md px-3 py-1 text-sm ${x.key === filter.key ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}>{x.label}</Link>
        ))}
      </div>
      <Card><CardContent className="px-0"><InvoiceTable invoices={rows} workers={workerMap} base="/company" /></CardContent></Card>
    </Page>
  );
}

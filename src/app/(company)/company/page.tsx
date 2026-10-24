import { Page } from "@/components/shell/page";
import { requireCompany } from "@/lib/session";

export default async function CompanyHome() {
  const s = await requireCompany();
  return (
    <Page title="Dashboard" description={`Organization ${s.orgId}`}>
      <p className="text-sm text-muted-foreground">Dashboard coming in Task 8.</p>
    </Page>
  );
}

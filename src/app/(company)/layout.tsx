import { Header } from "@/components/shell/header";
import { OrgSwitcherClient } from "@/components/shell/org-switcher-client";
import { getOrg } from "@/lib/db/repo";
import { personaById, requireCompany } from "@/lib/session";

const ITEMS = [
  { href: "/company", label: "Dashboard" },
  { href: "/company/invoices", label: "Invoices" },
  { href: "/company/payroll", label: "Payroll" },
  { href: "/company/workers", label: "Workers" },
  { href: "/company/approvals", label: "Approvals" },
];

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const s = await requireCompany();
  const persona = personaById(s.personaId);
  const orgs = (await Promise.all(s.orgIds.map((id) => getOrg(id)))).filter((o) => o !== null);
  return (
    <>
      <Header
        home="/company"
        items={ITEMS}
        recipient={{ type: "org", id: s.orgId }}
        name={s.name}
        subtitle={persona?.subtitle ?? "Company"}
        extra={<OrgSwitcherClient orgs={orgs} activeId={s.orgId} />}
      />
      {children}
    </>
  );
}

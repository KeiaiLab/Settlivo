import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/shell/header";
import { Page } from "@/components/shell/page";
import { listNotifications, markNotificationsRead } from "@/lib/db/repo";
import type { Recipient } from "@/lib/domain/types";
import { formatDateTime } from "@/lib/format";
import { getSession, personaById } from "@/lib/session";

const COMPANY_ITEMS = [
  { href: "/company", label: "Dashboard" },
  { href: "/company/invoices", label: "Invoices" },
  { href: "/company/payroll", label: "Payroll" },
  { href: "/company/wallets", label: "Wallets" },
  { href: "/company/billing", label: "Billing" },
  { href: "/company/workers", label: "Workers" },
  { href: "/company/approvals", label: "Approvals" },
];
const WORKER_ITEMS = [
  { href: "/worker", label: "Home" },
  { href: "/worker/request", label: "Request payment" },
  { href: "/worker/withdraw", label: "Withdraw" },
  { href: "/worker/settings", label: "Settings" },
];

export default async function NotificationsPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  const recipient: Recipient = s.role === "company" ? { type: "org", id: s.orgId! } : { type: "worker", id: s.workerId! };
  const items = await listNotifications(recipient, 200);
  await markNotificationsRead(recipient);
  const groups = new Map<string, typeof items>();
  for (const n of items) {
    const day = new Date(n.createdAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    groups.set(day, [...(groups.get(day) ?? []), n]);
  }
  return (
    <>
      <Header home={s.role === "company" ? "/company" : "/worker"} items={s.role === "company" ? COMPANY_ITEMS : WORKER_ITEMS} recipient={recipient} name={s.name} subtitle={personaById(s.personaId)?.subtitle ?? ""} />
      <Page title="Notifications" description={`${items.length} total`}>
        {[...groups.entries()].map(([day, list]) => (
          <section key={day} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">{day}</h2>
            <ul className="divide-y rounded-lg border">
              {list.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                    <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-emerald-400"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{n.title}</span>
                      <span className="block text-xs text-muted-foreground">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
      </Page>
    </>
  );
}

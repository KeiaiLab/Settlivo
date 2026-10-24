import { Header } from "@/components/shell/header";
import { getWorker } from "@/lib/db/repo";
import { requireWorker } from "@/lib/session";

const ITEMS = [
  { href: "/worker", label: "Home" },
  { href: "/worker/request", label: "Request payment" },
  { href: "/worker/withdraw", label: "Withdraw" },
  { href: "/worker/settings", label: "Settings" },
];

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  return (
    <>
      <Header
        home="/worker"
        items={ITEMS}
        recipient={{ type: "worker", id: s.workerId }}
        name={s.name}
        subtitle={worker ? `${worker.country} · ${worker.localCurrency} · ${worker.kyc.status === "verified" ? "Verified" : "KYC pending"}` : "Worker"}
      />
      {children}
    </>
  );
}

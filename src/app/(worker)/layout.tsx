import { Header } from "@/components/shell/header";
import { personaById, requireWorker } from "@/lib/session";

const ITEMS = [
  { href: "/worker", label: "Home" },
  { href: "/worker/request", label: "Request payment" },
  { href: "/worker/withdraw", label: "Withdraw" },
  { href: "/worker/settings", label: "Settings" },
];

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const s = await requireWorker();
  const persona = personaById(s.personaId);
  return (
    <>
      <Header
        home="/worker"
        items={ITEMS}
        recipient={{ type: "worker", id: s.workerId }}
        name={s.name}
        subtitle={persona?.subtitle ?? "Worker"}
      />
      {children}
    </>
  );
}

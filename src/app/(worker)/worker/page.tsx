import { Page } from "@/components/shell/page";
import { requireWorker } from "@/lib/session";

export default async function WorkerHome() {
  const s = await requireWorker();
  return (
    <Page title="Home" description={`Worker ${s.workerId}`}>
      <p className="text-sm text-muted-foreground">Worker home coming in Task 9.</p>
    </Page>
  );
}

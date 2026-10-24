import { Page } from "@/components/shell/page";
import { Card, CardContent } from "@/components/ui/card";
import { KycWizard } from "@/components/worker/kyc-wizard";
import { completeKycStep, finishKyc } from "@/lib/actions/worker";
import { getWorker } from "@/lib/db/repo";
import { formatDateTime } from "@/lib/format";
import { requireWorker } from "@/lib/session";

export default async function OnboardingPage() {
  const s = await requireWorker();
  const worker = await getWorker(s.workerId);
  if (!worker) return null;
  return (
    <Page title="Verify your identity" description={worker.kyc.status === "verified" ? "You're verified." : "Three quick steps. Required once before your first payout."}>
      <Card className="max-w-3xl"><CardContent className="pt-6">
        {worker.kyc.status === "verified" ? (
          <p className="text-sm text-emerald-300">Verified on {worker.kyc.verifiedAt ? formatDateTime(worker.kyc.verifiedAt) : "file"}.</p>
        ) : (
          <KycWizard
            worker={worker}
            onStep={async (step) => { "use server"; await completeKycStep(step); }}
            onFinish={async () => { "use server"; await finishKyc(); }}
          />
        )}
      </CardContent></Card>
    </Page>
  );
}

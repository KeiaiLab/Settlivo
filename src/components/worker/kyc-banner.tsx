import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Worker } from "@/lib/domain/types";

export function KycBanner({ worker }: { worker: Worker }) {
  if (worker.kyc.status === "verified") return null;
  const done = Object.values(worker.kyc.steps).filter(Boolean).length;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm">
      <ShieldAlert className="size-5 text-orange-300" />
      <div className="flex-1">
        <div className="font-medium">Finish verification to receive payouts</div>
        <div className="text-xs text-muted-foreground">{done} of 3 steps complete. Scheduled invoices stay on hold until you're verified.</div>
      </div>
      <Button size="sm" render={<Link href="/worker/onboarding" />}>Continue</Button>
    </div>
  );
}

import { Page } from "@/components/shell/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { WithdrawForm } from "@/components/worker/withdraw-form";
import { createWithdrawal } from "@/lib/actions/worker";
const WITHDRAW_FEE = 0.005;
import { formatDateTime, formatUsdc } from "@/lib/format";
import { workerContext } from "@/lib/queries/worker";
import { requireWorker } from "@/lib/session";

export default async function WithdrawPage() {
  const s = await requireWorker();
  const ctx = await workerContext(s.workerId);
  if (!ctx) return null;
  const { worker, withdrawals, rates, balance } = ctx;
  const bank = worker.payoutPrefs.bankAccount ? `${worker.payoutPrefs.bankAccount.bankName} ${worker.payoutPrefs.bankAccount.accountMasked}` : undefined;
  return (
    <Page title={`Withdraw to ${worker.localCurrency}`} description="Off-ramp through a licensed local partner. Funds usually land in about ten minutes.">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-sm">New withdrawal</CardTitle><CardDescription>Compare with what a bank wire would have cost.</CardDescription></CardHeader>
          <CardContent>
            <WithdrawForm action={createWithdrawal} balance={balance} currency={worker.localCurrency} rate={rates.rates[worker.localCurrency]} fee={WITHDRAW_FEE} bank={bank} stablecoin={worker.payoutPrefs.stablecoin} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {withdrawals.length === 0 && <p className="text-muted-foreground">No withdrawals yet.</p>}
            {withdrawals.map((w) => (
              <div key={w.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between"><Money amount={w.localAmount} currency={w.currency} className="font-medium" /><StatusBadge status={w.status} /></div>
                <div className="text-xs text-muted-foreground">{formatUsdc(w.usdcAmount, worker.payoutPrefs.stablecoin)} · fee {formatUsdc(w.fee, worker.payoutPrefs.stablecoin)} · {w.bankAccountMasked} · {formatDateTime(w.createdAt)}</div>
                {w.status === "processing" && <div className="text-xs text-sky-300">Arriving {w.eta}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}

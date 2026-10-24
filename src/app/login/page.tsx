import { ArrowRight, Building2, ShieldCheck, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money, Usdc } from "@/components/ui/money";
import { currentRates } from "@/lib/actions/invoices";
import { loginAs } from "@/lib/actions/session";
import { SUPPORTED_CURRENCIES } from "@/lib/domain/types";
import { formatRate } from "@/lib/format";
import { toUsdc } from "@/lib/fx/convert";
import { PERSONAS } from "@/lib/seed/personas";
import { getSession, homeFor } from "@/lib/session";

/** Public landing + persona picker. The hero is the product's core artifact: one settled payout, priced at today's rate. */
export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect(homeFor(s));
  const rates = await currentRates();
  const sampleUsdc = toUsdc(4_200_000, "KRW", rates);
  const companies = PERSONAS.filter((p) => p.role === "company");
  const workers = PERSONAS.filter((p) => p.role === "worker");

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-col justify-between border-b border-border p-6 sm:p-8 lg:w-[56%] lg:border-b-0 lg:border-r lg:p-12">
        <Logo />
        <div className="my-10 max-w-xl lg:my-14">
          <h1 className="max-w-lg text-[2.1rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[2.75rem]">Payroll that crosses borders in minutes.</h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            Issue invoices in local currency, settle in USDC at the live rate, cash out locally. Every payout leaves a receipt on-chain.
          </p>

          <div className="mt-9 overflow-hidden rounded-md border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span>Settlement receipt</span>
              <span className="flex items-center gap-1 text-brand"><ShieldCheck className="size-3.5" /> Verified on-chain</span>
            </div>
            <dl className="grid gap-y-2.5 px-4 py-4 text-sm sm:grid-cols-[6rem_1fr] sm:gap-x-6">
              <dt className="text-muted-foreground">Invoice</dt>
              <dd>October salary, Alice Kim, Seoul</dd>
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="flex flex-wrap items-baseline gap-x-2">
                <Money amount={4_200_000} currency="KRW" className="font-medium" />
                <span className="text-muted-foreground">to</span>
                <Usdc value={sampleUsdc} className="font-medium" />
              </dd>
              <dt className="text-muted-foreground">Rate</dt>
              <dd className="tabular-nums">{formatRate(rates.rates.KRW, "KRW")}, fixed at send time</dd>
              <dt className="text-muted-foreground">Settled</dt>
              <dd className="tabular-nums">2 min 14 s after approval, block 21,400,118</dd>
              <dt className="text-muted-foreground">Memo</dt>
              <dd className="font-mono text-xs break-all">SETTLIVO|inv_8868e3da|f872023882f86269…</dd>
            </dl>
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums text-muted-foreground">
            {SUPPORTED_CURRENCIES.filter((c) => c !== "USD").map((c) => (
              <li key={c}><span className="text-foreground">{c}</span> {rates.rates[c].toLocaleString("en-US", { maximumFractionDigits: rates.rates[c] > 100 ? 2 : 4 })}</li>
            ))}
            <li>{rates.source === "live" ? "Live rates" : "Reference rates"} per USD</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Demo environment on Base Sepolia. No real funds move.</p>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose a demo account. No password needed.</p>
          </div>
          <Button variant="outline" className="w-full" nativeButton={false} render={<a href="#accounts" />}>
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.25 1.5-1.7 4.4-5.35 4.4-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.7 4.1 14.6 3.2 12 3.2 7.1 3.2 3.2 7.1 3.2 12s3.9 8.8 8.8 8.8c5.1 0 8.45-3.55 8.45-8.55 0-.6-.05-.8-.1-1.15Z"/></svg>
            Sign in with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or pick a demo account<span className="h-px flex-1 bg-border" /></div>

          <div id="accounts" className="space-y-4">
            <Group icon={<Building2 className="size-4" />} title="Company admins" items={companies} />
            <Group icon={<User className="size-4" />} title="Workers" items={workers} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Group({ icon, title, items }: { icon: React.ReactNode; title: string; items: typeof PERSONAS }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1">
        {items.map((p) => (
          <form key={p.id} action={loginAs}>
            <input type="hidden" name="persona" value={p.id} />
            <button type="submit" className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-surface-raised focus-visible:border-ring focus-visible:outline-none">
              <span className="text-lg">{p.flag}</span>
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.subtitle}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
            </button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}

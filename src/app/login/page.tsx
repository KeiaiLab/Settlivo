import { ArrowRight, Building2, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shell/logo";
import { loginAs } from "@/lib/actions/session";
import { PERSONAS } from "@/lib/seed/personas";
import { getSession, homeFor } from "@/lib/session";

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect(homeFor(s));
  const companies = PERSONAS.filter((p) => p.role === "company");
  const workers = PERSONAS.filter((p) => p.role === "worker");

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-950 via-background to-background p-8 lg:w-1/2 lg:p-12">
        <Logo />
        <div className="my-16 max-w-md">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">Global settlement platform</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight lg:text-4xl">
            Pay remote teams in stablecoins. Settled in minutes, not days.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            One place to issue invoices, approve payouts, and settle on-chain in USDC at live FX rates. Workers cash out to local currency whenever they want.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 text-sm">
            <div><dt className="text-muted-foreground">Settlement</dt><dd className="text-lg font-semibold">~10 min</dd></div>
            <div><dt className="text-muted-foreground">Fee</dt><dd className="text-lg font-semibold">0.5%</dd></div>
            <div><dt className="text-muted-foreground">Countries</dt><dd className="text-lg font-semibold">40+</dd></div>
          </dl>
        </div>
        <p className="text-xs text-muted-foreground">Demo environment · Base Sepolia · No real funds move.</p>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Choose a demo account to continue.</p>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">{icon}{title}</CardTitle>
        <CardDescription className="text-xs">Instant access, no password.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1.5">
        {items.map((p) => (
          <form key={p.id} action={loginAs}>
            <input type="hidden" name="persona" value={p.id} />
            <button type="submit" className="group flex w-full items-center gap-3 rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-muted/60">
              <span className="text-lg">{p.flag}</span>
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.subtitle}</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}

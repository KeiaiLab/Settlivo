import { Page } from "@/components/shell/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Usdc } from "@/components/ui/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addOrgWallet, setOrgDefaultWallet } from "@/lib/actions/wallets";
import { getChain } from "@/lib/chain";
import { getOrg, listInvoicesByOrg, listWalletsByOwner } from "@/lib/db/repo";
import type { Org, Wallet } from "@/lib/domain/types";
import { defaultWallet } from "@/lib/domain/wallets";
import { shortHash } from "@/lib/format";
import { thisMonth } from "@/lib/queries/company";
import { requireCompany } from "@/lib/session";

interface OrgWallets {
  org: Org;
  wallets: Wallet[];
  /** 6-dp strings, same order as `wallets`. */
  balances: string[];
  total: number;
  /** Confirmed USDC this month; settlements leave from the default wallet, so it is attributed there. */
  paidThisMonth: number;
  defaultId?: string;
}

/** Spec §5.12: every org the user administers, each with its wallets and live balances. */
async function loadOrg(orgId: string): Promise<OrgWallets | null> {
  const [org, wallets, invoices] = await Promise.all([
    getOrg(orgId),
    listWalletsByOwner({ type: "org", id: orgId }),
    listInvoicesByOrg(orgId),
  ]);
  if (!org) return null;
  const chain = getChain();
  const balances = await Promise.all(wallets.map((w) => chain.getBalance(w.address, w.token)));
  const total = balances.reduce((sum, b) => sum + Number(b), 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "confirmed" && thisMonth(i.history.at(-1)?.at ?? i.createdAt))
    .reduce((sum, i) => sum + Number(i.usdcAmount ?? 0), 0);
  return { org, wallets, balances, total, paidThisMonth, defaultId: defaultWallet(wallets)?.id };
}

const KIND_LABEL: Record<Wallet["kind"], string> = { platform: "Settlivo-custodied", external: "External" };
const countWallets = (n: number) => `${n} ${n === 1 ? "wallet" : "wallets"}`;

export default async function WalletsPage() {
  const s = await requireCompany();
  const orgs = (await Promise.all(s.orgIds.map(loadOrg))).filter((o): o is OrgWallets => o !== null);

  return (
    <Page title="Wallets" description="Every company account you administer and the wallets behind it.">
      <div className="space-y-4">
        {orgs.map(({ org, wallets, balances, total, paidThisMonth, defaultId }) => {
          const active = org.id === s.orgId;
          return (
            <Card key={org.id} data-testid="org-card">
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>
                  {org.country} · {countWallets(wallets.length)} · <Usdc value={total} />
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {wallets.length === 0 ? (
                  <p className="px-4 text-sm text-muted-foreground">No wallets yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Paid this month</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wallets.map((w, i) => {
                        const isDefault = w.id === defaultId;
                        return (
                          <TableRow key={w.id}>
                            <TableCell className="font-medium">{w.label}</TableCell>
                            <TableCell><span className="font-mono text-xs" title={w.address}>{shortHash(w.address)}</span></TableCell>
                            <TableCell className="text-muted-foreground">{KIND_LABEL[w.kind]}</TableCell>
                            <TableCell className="min-w-32"><Usdc value={balances[i]} token={w.token} justify /></TableCell>
                            <TableCell className="min-w-32 text-muted-foreground"><Usdc value={isDefault ? paidThisMonth : 0} token={w.token} justify /></TableCell>
                            <TableCell className="text-right">
                              {isDefault ? (
                                <Badge variant="outline">Default</Badge>
                              ) : active && w.status === "active" ? (
                                <form action={async () => { "use server"; await setOrgDefaultWallet(w.id); }} className="inline-flex">
                                  <Button type="submit" size="xs" variant="outline">Make default</Button>
                                </form>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                {active ? (
                  <form action={addOrgWallet} className="mt-4 grid gap-3 border-t px-4 pt-4">
                    <h2 className="text-sm font-medium">Add a wallet</h2>
                    <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                      <div className="grid gap-1.5">
                        <Label htmlFor="label">Label</Label>
                        <Input id="label" name="label" required placeholder="e.g. Operations" />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="address">Address (optional)</Label>
                        <Input id="address" name="address" placeholder="0x..." pattern="0x[0-9a-fA-F]{40}" aria-describedby="address-help" className="font-mono" />
                      </div>
                      <Button type="submit">Add wallet</Button>
                    </div>
                    <p id="address-help" className="text-xs text-muted-foreground">Leave blank to create a Settlivo-custodied wallet</p>
                  </form>
                ) : (
                  <p className="mt-4 px-4 text-xs text-muted-foreground">Switch to {org.name} in the header to add wallets or change its default.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

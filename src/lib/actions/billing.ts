"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrg, listInvoicesByOrg, putInvoice, putOrg } from "@/lib/db/repo";
import { currentPlan, PLANS, upgrade } from "@/lib/domain/plan";
import type { PlanTier } from "@/lib/domain/types";
import { scheduleInvoice } from "@/lib/scheduler";
import { notify } from "@/lib/settlement/notify";
import { requireCompany } from "@/lib/session";

/** Roadmap stage 1: simulated card checkout. Upgrading releases every invoice the plan limit was holding. */
export async function upgradePlan(formData: FormData) {
  const s = await requireCompany();
  const org = await getOrg(s.orgId);
  if (!org) throw new Error("Organization not found");
  const tier = String(formData.get("tier")) as PlanTier;
  if (!(tier in PLANS) || tier === "free") throw new Error("Choose a paid plan");
  const now = new Date().toISOString();
  const plan = upgrade(currentPlan(org.plan, now), tier, now);
  await putOrg({ ...org, plan });

  const held = (await listInvoicesByOrg(s.orgId)).filter((i) => i.status === "scheduled" && i.blockedReason === "plan");
  for (const inv of held) {
    await putInvoice({ ...inv, blockedReason: undefined });
    await scheduleInvoice(inv.id);
  }
  await notify(
    { type: "org", id: s.orgId },
    "plan_upgraded",
    `${org.name} is on ${PLANS[tier].label}`,
    held.length > 0 ? `Unlimited sends. ${held.length} held payout${held.length === 1 ? "" : "s"} resumed.` : "Unlimited sends from now on.",
    "/company/billing",
  );
  revalidatePath("/company/billing");
  revalidatePath("/company");
  redirect("/company/billing");
}

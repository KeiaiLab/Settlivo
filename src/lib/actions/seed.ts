"use server";

import { redirect } from "next/navigation";
import { seedAll } from "@/lib/seed";

/** Presenter's reset button on /login (spec §7). Guarded by SEED_SECRET when one is configured. */
export async function resetDemo(formData: FormData) {
  const secret = process.env.SEED_SECRET;
  if (secret && String(formData.get("secret") ?? "") !== secret) redirect("/login?reset=denied");
  await seedAll({ flush: true });
  redirect("/login?reset=done");
}

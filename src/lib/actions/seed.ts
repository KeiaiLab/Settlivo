"use server";

import { redirect } from "next/navigation";
import { seedAll } from "@/lib/seed";

/** Presenter's reset button on /login (spec §7). One click re-seeds; the demo holds no real data, so no code is asked. */
export async function resetDemo() {
  await seedAll({ flush: true });
  redirect("/login?reset=done");
}

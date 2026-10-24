import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/session";

export default async function Root() {
  const s = await getSession();
  redirect(s ? homeFor(s) : "/login");
}

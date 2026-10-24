"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, homeFor, personaById, SESSION_COOKIE, type Session } from "@/lib/session";

async function write(session: Session) {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function loginAs(formData: FormData) {
  const id = String(formData.get("persona") ?? "");
  const p = personaById(id);
  if (!p) redirect("/login");
  const session: Session = {
    personaId: p.id,
    role: p.role,
    name: p.name,
    orgIds: p.orgIds,
    orgId: p.role === "company" ? p.orgIds[0] : undefined,
    workerId: p.workerId,
  };
  await write(session);
  redirect(homeFor(session));
}

export async function switchOrg(orgId: string) {
  const s = await getSession();
  if (!s || s.role !== "company" || !s.orgIds.includes(orgId)) return;
  await write({ ...s, orgId });
  redirect("/company");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

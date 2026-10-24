import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PERSONAS, type Persona, type PersonaId } from "@/lib/seed/personas";

export const SESSION_COOKIE = "settlivo_session";

export interface Session {
  personaId: PersonaId;
  role: "company" | "worker";
  name: string;
  orgIds: string[];
  orgId?: string;
  workerId?: string;
}

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function requireCompany(): Promise<Session & { orgId: string }> {
  const s = await getSession();
  if (!s || s.role !== "company" || !s.orgId) redirect("/login");
  return s as Session & { orgId: string };
}

export async function requireWorker(): Promise<Session & { workerId: string }> {
  const s = await getSession();
  if (!s || s.role !== "worker" || !s.workerId) redirect("/login");
  return s as Session & { workerId: string };
}

export function homeFor(s: Session): string {
  return s.role === "company" ? "/company" : "/worker";
}

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { seedAll } from "@/lib/seed";

/** Constant-time comparison so the seed secret cannot be guessed byte by byte from response timing. */
function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  if (!secret || !secretMatches(req.headers.get("x-seed-secret"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { flush?: boolean };
  const result = await seedAll({ flush: body.flush ?? true });
  return NextResponse.json(result);
}

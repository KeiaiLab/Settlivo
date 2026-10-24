import { NextResponse } from "next/server";
import { seedAll } from "@/lib/seed";

export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  if (!secret || req.headers.get("x-seed-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { flush?: boolean };
  const result = await seedAll({ flush: body.flush ?? true });
  return NextResponse.json(result);
}

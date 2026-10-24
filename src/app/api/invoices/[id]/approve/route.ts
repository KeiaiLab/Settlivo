import { NextResponse } from "next/server";
import { approveInvoice } from "@/lib/scheduler";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { approved?: boolean; by?: string; reason?: string };
  const inv = await approveInvoice(id, body.by ?? "api", body.approved ?? true, body.reason);
  return NextResponse.json({ id: inv.id, status: inv.status });
}

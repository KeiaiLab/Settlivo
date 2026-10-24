"use client";

import { Check, FileUp, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Worker } from "@/lib/domain/types";

type Step = "identity" | "address" | "tax";
const STEPS: { key: Step; title: string; desc: string }[] = [
  { key: "identity", title: "Identity document", desc: "Passport or national ID. We check it against sanctions and PEP lists." },
  { key: "address", title: "Residential address", desc: "Used for tax residency and to match your bank account." },
  { key: "tax", title: "Tax information", desc: "Local tax ID so your company can file contractor reports." },
];

export function KycWizard({ worker, onStep, onFinish }: { worker: Worker; onStep: (s: Step) => Promise<void>; onFinish: () => Promise<void> }) {
  const [pending, start] = useTransition();
  const [reviewing, setReviewing] = useState(false);
  const allDone = STEPS.every((s) => worker.kyc.steps[s.key]);
  const current = STEPS.find((s) => !worker.kyc.steps[s.key]);

  useEffect(() => {
    if (!reviewing) return;
    const t = setTimeout(() => start(() => onFinish()), 3000);
    return () => clearTimeout(t);
  }, [reviewing, onFinish]);

  if (reviewing || (allDone && worker.kyc.status !== "verified")) {
    if (!reviewing) setReviewing(true);
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2 className="size-8 animate-spin text-emerald-400" />
        <div className="font-medium">Reviewing your documents…</div>
        <div className="text-sm text-muted-foreground">Automated checks usually finish in a few seconds.</div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const done = worker.kyc.steps[s.key];
          const active = current?.key === s.key;
          return (
            <li key={s.key} className={`flex items-center gap-2 text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>
              <span className={`grid size-6 place-items-center rounded-full border text-xs ${done ? "border-emerald-500 bg-emerald-500 text-emerald-950" : active ? "border-emerald-400" : "border-border"}`}>{done ? <Check className="size-3" /> : i + 1}</span>
              {s.title}
            </li>
          );
        })}
      </ol>
      {current && (
        <form
          onSubmit={(e) => { e.preventDefault(); start(() => onStep(current.key)); }}
          className="space-y-4 rounded-lg border p-5"
        >
          <div>
            <h3 className="font-medium">{current.title}</h3>
            <p className="text-sm text-muted-foreground">{current.desc}</p>
          </div>
          {current.key === "identity" && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/40">
              <FileUp className="size-6" />
              Drop your passport scan here or click to upload
              <input type="file" className="sr-only" />
            </label>
          )}
          {current.key === "address" && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Street address</Label><Input defaultValue="12 Teheran-ro, Gangnam-gu" /></div>
              <div className="grid grid-cols-2 gap-3"><div className="grid gap-1.5"><Label>City</Label><Input defaultValue="Seoul" /></div><div className="grid gap-1.5"><Label>Country</Label><Input defaultValue={worker.country} /></div></div>
            </div>
          )}
          {current.key === "tax" && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label>Tax ID</Label><Input defaultValue="•••-••-4821" /></div>
              <div className="grid gap-1.5"><Label>Tax residency</Label><Input defaultValue={worker.country} /></div>
            </div>
          )}
          <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Continue"}</Button></div>
        </form>
      )}
    </div>
  );
}

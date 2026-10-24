"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApproveButtons({
  onDecide,
  approveLabel = "Approve",
}: {
  onDecide: (approved: boolean, reason?: string) => Promise<void>;
  approveLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  if (rejecting) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-8 w-48" />
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => start(async () => { await onDecide(false, reason || "Rejected"); toast("Rejected", { description: "Email sent to the counterparty." }); })}>Confirm reject</Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => { await onDecide(true); toast.success("Approved", { description: "Email sent to the counterparty." }); })}>{approveLabel}</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>Reject</Button>
    </div>
  );
}

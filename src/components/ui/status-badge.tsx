import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Status = InvoiceStatus | "blocked" | "processing" | "completed" | "verified" | "pending";

const STYLES: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  scheduled: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sending: "bg-violet-500/15 text-violet-300 border-violet-500/30 animate-pulse",
  confirmed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  failed: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  blocked: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  processing: "bg-sky-500/15 text-sky-300 border-sky-500/30 animate-pulse",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const LABELS: Record<Status, string> = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  scheduled: "Scheduled",
  sending: "Sending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  failed: "Failed",
  blocked: "Blocked · KYC",
  processing: "Processing",
  completed: "Completed",
  verified: "Verified",
  pending: "Pending",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" data-testid="status-badge" className={cn("font-medium", STYLES[status], className)}>
      {LABELS[status]}
    </Badge>
  );
}

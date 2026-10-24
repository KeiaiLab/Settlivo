"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RetryButton({ onRetry, label = "Retry settlement" }: { onRetry: () => Promise<void>; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" disabled={pending} onClick={() => start(async () => { await onRetry(); toast("Settlement restarted"); })}>
      {label}
    </Button>
  );
}

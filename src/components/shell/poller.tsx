"use client";

import { usePoll } from "@/hooks/use-poll";

export function Poller({ ms = 3000 }: { ms?: number }) {
  usePoll(ms);
  return null;
}

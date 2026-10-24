"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Every `ms` while visible: ping /api/tick (settles due work in tick mode, completes withdrawals) then refresh server components. */
export function usePoll(ms = 3000) {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (document.visibilityState !== "visible" || busy) return;
      busy = true;
      try {
        await fetch("/api/tick", { cache: "no-store" });
      } catch {
        /* ignore */
      } finally {
        busy = false;
        router.refresh();
      }
    };
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [router, ms]);
}

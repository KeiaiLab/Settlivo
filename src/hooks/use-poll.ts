"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refreshes server components every `ms` while the tab is visible. */
export function usePoll(ms = 3000) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [router, ms]);
}

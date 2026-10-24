"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local picker that submits an ISO timestamp (`name`) computed in the
 * browser's timezone, so the server never guesses the user's offset.
 */
export function LocalDateTime({ id, name, defaultOffsetMs = 2 * 60_000 }: { id: string; name: string; defaultOffsetMs?: number }) {
  const [local, setLocal] = useState("");
  useEffect(() => {
    // Deferred so server and client render the same empty value first (no hydration mismatch).
    const id = setTimeout(() => setLocal(toLocalInput(new Date(Date.now() + defaultOffsetMs))), 0);
    return () => clearTimeout(id);
  }, [defaultOffsetMs]);
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <Input id={id} name={`${name}Local`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

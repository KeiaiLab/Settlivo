"use client";

import { ChevronsUpDown } from "lucide-react";
import { useTransition } from "react";
import { switchOrg } from "@/lib/actions/session";
import type { Org } from "@/lib/domain/types";

/** Reads as part of the header wordmark ("Settlivo | Acme Remote") rather than a form control. */
export function OrgSwitcherClient({ orgs, activeId }: { orgs: Org[]; activeId: string }) {
  const [pending, start] = useTransition();
  if (orgs.length <= 1) return <span className="text-sm text-muted-foreground">{orgs[0]?.name}</span>;
  return (
    <div className="relative">
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => start(() => switchOrg(e.target.value))}
        className="h-8 appearance-none rounded-md border border-transparent bg-transparent pl-2 pr-7 text-sm font-medium transition-colors hover:border-border hover:bg-surface-raised focus-visible:border-ring focus-visible:outline-none"
        aria-label="Organization"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-1.5 top-2 size-4 text-muted-foreground" />
    </div>
  );
}

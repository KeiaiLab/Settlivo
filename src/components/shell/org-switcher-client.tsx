"use client";

import { ChevronsUpDown } from "lucide-react";
import { useTransition } from "react";
import { switchOrg } from "@/lib/actions/session";
import type { Org } from "@/lib/domain/types";

export function OrgSwitcherClient({ orgs, activeId }: { orgs: Org[]; activeId: string }) {
  const [pending, start] = useTransition();
  if (orgs.length <= 1) return <span className="text-sm text-muted-foreground">{orgs[0]?.name}</span>;
  return (
    <div className="relative">
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => start(() => switchOrg(e.target.value))}
        className="h-8 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm"
        aria-label="Organization"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2 top-2 size-4 text-muted-foreground" />
    </div>
  );
}

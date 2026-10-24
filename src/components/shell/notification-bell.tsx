import { Bell } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listNotifications } from "@/lib/db/repo";
import type { Recipient } from "@/lib/domain/types";
import { timeAgo } from "@/lib/format";

export async function NotificationBell({ recipient }: { recipient: Recipient }) {
  const items = await listNotifications(recipient, 8);
  const unread = items.filter((n) => !n.read).length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative grid size-8 place-items-center rounded-md hover:bg-muted" aria-label="Notifications">
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-emerald-950">
            {unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Link href="/notifications" className="text-xs font-normal text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && <div className="px-2 py-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} render={<Link href={n.href} />} className="flex flex-col items-start gap-0.5 py-2">
            <span className="flex w-full items-center gap-2 text-sm">
              {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />}
              <span className="truncate">{n.title}</span>
            </span>
            <span className="line-clamp-1 text-xs text-muted-foreground">{n.body}</span>
            <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

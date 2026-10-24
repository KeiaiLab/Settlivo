import type { ReactNode } from "react";
import { Logo } from "./logo";
import { Nav, type NavItem } from "./nav";
import { NotificationBell } from "./notification-bell";
import { PersonaBadge } from "./persona-badge";
import { Poller } from "./poller";
import type { Recipient } from "@/lib/domain/types";

export function Header({
  home,
  items,
  recipient,
  name,
  subtitle,
  extra,
}: {
  home: string;
  items: NavItem[];
  recipient: Recipient;
  name: string;
  subtitle: string;
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <Poller />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo href={home} />
        {extra}
        <Nav items={items} className="ml-2 hidden md:flex" />
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell recipient={recipient} />
          <PersonaBadge name={name} subtitle={subtitle} />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-2 pb-2 md:hidden">
        <Nav items={items} />
      </div>
    </header>
  );
}

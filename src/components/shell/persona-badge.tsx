import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/session";
import { Button } from "@/components/ui/button";

export function PersonaBadge({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

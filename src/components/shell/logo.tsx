import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-md bg-emerald-500 text-sm font-bold text-emerald-950">S</span>
      <span>Settlivo</span>
    </Link>
  );
}

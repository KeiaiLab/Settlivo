import Link from "next/link";

/** Settlivo mark: settled-green tile with an S drawn as a single settlement path. Shared by the header and app/icon.svg. */
function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#2fd38a" />
      <path d="M22 10.5c0-3-12-3-12 1.5s12 1.5 12 6-12 4.5-12 1.5" fill="none" stroke="#06241a" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-[-0.01em]">
      <LogoMark />
      <span>Settlivo</span>
    </Link>
  );
}

import type { ReactNode } from "react";

export function Page({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div data-testid="page-actions" className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}

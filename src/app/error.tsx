"use client";

import { Button } from "@/components/ui/button";

/** Spec §8: one honest error page instead of a blank screen (validation errors, Redis or Workflow unavailable). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">That didn&apos;t go through</h1>
      <p className="text-sm text-muted-foreground">{error.message || "Service unavailable. Check the Upstash and Workflow configuration."}</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => history.back()}>Go back</Button>
      </div>
    </main>
  );
}

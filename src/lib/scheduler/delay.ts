export function computeDelayMs(scheduledAt: string, now: Date = new Date()): number {
  return Math.max(0, new Date(scheduledAt).getTime() - now.getTime());
}

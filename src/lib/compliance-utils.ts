// Pure compliance/recertification helpers — no DB access, so they're unit-testable.

export const DAY_MS = 86_400_000

export function dueLabelFor(dueAt: string | null, nowMs: number = Date.now()): string {
  if (!dueAt) return ''
  const days = Math.ceil((new Date(dueAt).getTime() - nowMs) / DAY_MS)
  if (days < 0) return `overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'due today'
  return `due in ${days} day${days === 1 ? '' : 's'}`
}

// Given when a course was last completed and how often it must be recertified,
// returns the expiry timestamp, whether it has lapsed, and whether it's within
// the 30-day renewal window (or already past).
export function recertStatus(lastCompletedMs: number, intervalDays: number, nowMs: number = Date.now()) {
  const expiresAt = lastCompletedMs + intervalDays * DAY_MS
  return {
    expiresAt,
    expired: nowMs > expiresAt,
    dueSoon: nowMs >= expiresAt - 30 * DAY_MS,
  }
}

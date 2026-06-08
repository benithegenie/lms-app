import { describe, it, expect } from 'vitest'
import { dueLabelFor, recertStatus, DAY_MS } from './compliance-utils'

const NOW = new Date('2026-06-07T12:00:00Z').getTime()

describe('dueLabelFor', () => {
  it('returns empty string for no deadline', () => {
    expect(dueLabelFor(null, NOW)).toBe('')
  })
  it('says "due today" at the deadline', () => {
    expect(dueLabelFor(new Date(NOW).toISOString(), NOW)).toBe('due today')
  })
  it('counts whole days in the future, with pluralization', () => {
    expect(dueLabelFor(new Date(NOW + 3 * DAY_MS).toISOString(), NOW)).toBe('due in 3 days')
    expect(dueLabelFor(new Date(NOW + 1 * DAY_MS).toISOString(), NOW)).toBe('due in 1 day')
  })
  it('reports overdue with pluralization', () => {
    expect(dueLabelFor(new Date(NOW - 2 * DAY_MS).toISOString(), NOW)).toBe('overdue by 2 days')
    expect(dueLabelFor(new Date(NOW - 1 * DAY_MS).toISOString(), NOW)).toBe('overdue by 1 day')
  })
})

describe('recertStatus', () => {
  it('is valid within the interval', () => {
    const completed = NOW - 10 * DAY_MS
    const s = recertStatus(completed, 365, NOW)
    expect(s.expired).toBe(false)
    expect(s.dueSoon).toBe(false)
    expect(s.expiresAt).toBe(completed + 365 * DAY_MS)
  })
  it('is expired after the interval lapses', () => {
    expect(recertStatus(NOW - 400 * DAY_MS, 365, NOW).expired).toBe(true)
  })
  it('is dueSoon within 30 days of expiry but not yet expired', () => {
    const s = recertStatus(NOW - 340 * DAY_MS, 365, NOW) // expires in ~25 days
    expect(s.expired).toBe(false)
    expect(s.dueSoon).toBe(true)
  })
})

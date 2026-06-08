import { supabase } from '@/lib/supabase'
import type { AuditEvent, AuditLog } from '@/types/database'

export type AuditRow = {
  id: string
  event: AuditEvent
  who: string
  courseTitle: string | null
  detail: Record<string, unknown> | null
  createdAt: string
}

// Admin-only (RLS enforces). Resolves subject + course names in a couple of
// follow-up queries to avoid ambiguous multi-FK embeds.
export async function fetchAuditLog(courseId?: string): Promise<AuditRow[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as AuditLog[]

  const profileIds = [...new Set(rows.map((r) => r.profile_id).filter(Boolean))] as string[]
  const courseIds = [...new Set(rows.map((r) => r.course_id).filter(Boolean))] as string[]

  const pMap = new Map<string, string>()
  if (profileIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', profileIds)
    for (const p of (profs ?? []) as { id: string; full_name: string | null; email: string }[]) {
      pMap.set(p.id, p.full_name ?? p.email)
    }
  }

  const cMap = new Map<string, string>()
  if (courseIds.length) {
    const { data: crs } = await supabase.from('courses').select('id, title').in('id', courseIds)
    for (const c of (crs ?? []) as { id: string; title: string }[]) cMap.set(c.id, c.title)
  }

  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    who: (r.profile_id && pMap.get(r.profile_id)) || 'Unknown',
    courseTitle: (r.course_id && cMap.get(r.course_id)) || null,
    detail: (r.detail as Record<string, unknown> | null) ?? null,
    createdAt: r.created_at,
  }))
}

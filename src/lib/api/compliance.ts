import { supabase } from '@/lib/supabase'
import type { Course, Profile } from '@/types/database'
import { fetchEnrolledCourses } from '@/lib/api/courses'
import { fetchAllCompletions, fetchEnrollmentsByCourse } from '@/lib/api/students'
import { dueLabelFor, recertStatus } from '@/lib/compliance-utils'

// ---- Admin: configure a mandatory course --------------------------------

export async function updateCourseMandatory(
  courseId: string,
  opts: { is_mandatory: boolean; due_in_days: number | null; recert_interval_days: number | null },
) {
  const { error } = await supabase
    .from('courses')
    .update({
      is_mandatory: opts.is_mandatory,
      due_in_days: opts.due_in_days,
      recert_interval_days: opts.recert_interval_days,
    })
    .eq('id', courseId)
  if (error) throw error
}

export async function fetchRequiredGroupIds(courseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('course_required_groups')
    .select('group_id')
    .eq('course_id', courseId)
  if (error) throw error
  return (data ?? []).map((r) => r.group_id)
}

// Full-replace the set of groups required to take this course.
export async function setRequiredGroups(courseId: string, groupIds: string[]) {
  const { error: delErr } = await supabase
    .from('course_required_groups')
    .delete()
    .eq('course_id', courseId)
  if (delErr) throw delErr
  if (groupIds.length) {
    const { error: insErr } = await supabase
      .from('course_required_groups')
      .insert(groupIds.map((gid) => ({ course_id: courseId, group_id: gid })))
    if (insErr) throw insErr
  }
}

// Enroll every member of the required groups and (re)create their
// "mandatory_assigned" notifications. Returns how many people were targeted.
export async function assignMandatoryCourse(courseId: string): Promise<number> {
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('due_in_days')
    .eq('id', courseId)
    .single()
  if (cErr) throw cErr
  const dueInDays = course?.due_in_days ?? null

  const groupIds = await fetchRequiredGroupIds(courseId)
  if (!groupIds.length) return 0

  const { data: gm, error: gErr } = await supabase
    .from('group_members')
    .select('profile_id')
    .in('group_id', groupIds)
  if (gErr) throw gErr
  const profileIds = Array.from(new Set((gm ?? []).map((r) => r.profile_id)))
  if (!profileIds.length) return 0

  // Enroll (ignore people already enrolled)
  const { error: enrErr } = await supabase
    .from('enrollments')
    .upsert(
      profileIds.map((pid) => ({ student_id: pid, course_id: courseId })),
      { onConflict: 'student_id,course_id', ignoreDuplicates: true },
    )
  if (enrErr) throw enrErr

  // Reset pending notifications for this course, then create fresh ones
  await supabase
    .from('notifications')
    .delete()
    .eq('course_id', courseId)
    .eq('type', 'mandatory_assigned')
    .is('dismissed_at', null)

  const dueAt =
    dueInDays != null ? new Date(Date.now() + dueInDays * 86_400_000).toISOString() : null

  const { error: nErr } = await supabase.from('notifications').insert(
    profileIds.map((pid) => ({
      profile_id: pid,
      course_id: courseId,
      type: 'mandatory_assigned' as const,
      due_at: dueAt,
    })),
  )
  if (nErr) throw nErr

  return profileIds.length
}

// ---- Student: which required courses are still pending ------------------

export type PendingMandatory = {
  course: Course
  dueAt: string | null
  dueLabel: string
  kind: 'incomplete' | 'recert'
}

export async function fetchPendingMandatory(studentId: string): Promise<PendingMandatory[]> {
  const enrolled = await fetchEnrolledCourses(studentId)
  const mandatory = enrolled.filter((c) => c.is_mandatory)
  if (!mandatory.length) return []

  const completions = await fetchAllCompletions(studentId)
  const completedAt: Record<string, string> = {}
  for (const c of completions) completedAt[c.lesson_id] = c.completed_at

  const { data: notifs } = await supabase
    .from('notifications')
    .select('course_id, due_at')
    .eq('profile_id', studentId)
    .is('dismissed_at', null)
  const dueByCourse: Record<string, string | null> = {}
  for (const n of (notifs ?? []) as { course_id: string; due_at: string | null }[]) {
    dueByCourse[n.course_id] = n.due_at
  }

  const pending: PendingMandatory[] = []
  for (const course of mandatory) {
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', course.id)
    const moduleIds = (modules ?? []).map((m) => m.id)
    let lessonIds: string[] = []
    if (moduleIds.length) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', moduleIds)
      lessonIds = (lessons ?? []).map((l) => l.id)
    }
    const total = lessonIds.length
    if (total === 0) continue

    const completionTimes = lessonIds.map((id) => completedAt[id]).filter(Boolean) as string[]
    const done = completionTimes.length

    if (done < total) {
      const dueAt = dueByCourse[course.id] ?? null
      pending.push({ course, dueAt, dueLabel: dueLabelFor(dueAt), kind: 'incomplete' })
      continue
    }

    // Fully complete — has the recertification window lapsed?
    if (course.recert_interval_days != null) {
      const lastCompleted = Math.max(...completionTimes.map((t) => new Date(t).getTime()))
      const { expiresAt, expired } = recertStatus(lastCompleted, course.recert_interval_days)
      if (expired) {
        pending.push({
          course,
          dueAt: new Date(expiresAt).toISOString(),
          dueLabel: 'recertification overdue',
          kind: 'recert',
        })
      }
    }
  }
  return pending
}

// ---- Admin compliance dashboard -----------------------------------------

export type ComplianceStatus = 'complete' | 'in_progress' | 'overdue'

export type ComplianceRow = {
  student: Profile
  completed: number
  total: number
  dueAt: string | null
  status: ComplianceStatus
  expiresAt: string | null
}

export async function fetchMandatoryCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_mandatory', true)
    .order('title')
  if (error) throw error
  return data as Course[]
}

export async function fetchCourseCompliance(courseId: string): Promise<ComplianceRow[]> {
  const enr = (await fetchEnrollmentsByCourse(courseId)) as unknown as {
    student_id: string
    profiles: Profile
  }[]
  if (!enr.length) return []
  const studentIds = enr.map((r) => r.student_id)

  const { data: course } = await supabase
    .from('courses')
    .select('recert_interval_days')
    .eq('id', courseId)
    .single()
  const recertDays = course?.recert_interval_days ?? null

  // lesson ids for this course
  const { data: modules } = await supabase.from('modules').select('id').eq('course_id', courseId)
  const moduleIds = (modules ?? []).map((m) => m.id)
  let lessonIds: string[] = []
  if (moduleIds.length) {
    const { data: lessons } = await supabase.from('lessons').select('id').in('module_id', moduleIds)
    lessonIds = (lessons ?? []).map((l) => l.id)
  }
  const total = lessonIds.length

  // completions per student (this course only)
  const completedByStudent: Record<string, number> = {}
  const lastByStudent: Record<string, number> = {}
  if (lessonIds.length) {
    const { data: comps } = await supabase
      .from('lesson_completions')
      .select('student_id, lesson_id, completed_at')
      .in('lesson_id', lessonIds)
      .in('student_id', studentIds)
    for (const c of (comps ?? []) as { student_id: string; lesson_id: string; completed_at: string }[]) {
      completedByStudent[c.student_id] = (completedByStudent[c.student_id] ?? 0) + 1
      const t = new Date(c.completed_at).getTime()
      lastByStudent[c.student_id] = Math.max(lastByStudent[c.student_id] ?? 0, t)
    }
  }

  // due dates
  const { data: notifs } = await supabase
    .from('notifications')
    .select('profile_id, due_at')
    .eq('course_id', courseId)
    .in('profile_id', studentIds)
  const dueByStudent: Record<string, string | null> = {}
  for (const n of (notifs ?? []) as { profile_id: string; due_at: string | null }[]) {
    if (n.due_at) dueByStudent[n.profile_id] = n.due_at
  }

  const now = Date.now()
  return enr
    .map((r): ComplianceRow => {
      const completed = completedByStudent[r.student_id] ?? 0
      const isComplete = total > 0 && completed >= total
      const dueAt = dueByStudent[r.student_id] ?? null
      let status: ComplianceStatus = isComplete ? 'complete' : 'in_progress'
      if (!isComplete && dueAt && new Date(dueAt).getTime() < now) status = 'overdue'

      let expiresAt: string | null = null
      if (isComplete && recertDays != null && lastByStudent[r.student_id]) {
        const rs = recertStatus(lastByStudent[r.student_id], recertDays, now)
        expiresAt = new Date(rs.expiresAt).toISOString()
        if (rs.expired) status = 'overdue' // recertification lapsed
      }
      return { student: r.profiles, completed, total, dueAt, status, expiresAt }
    })
    .sort((a, b) =>
      (a.student.full_name ?? a.student.email).localeCompare(b.student.full_name ?? b.student.email),
    )
}

// Re-issue a reminder for one student (resets the deadline + records a reminder
// row the email job will pick up once email delivery is set up).
export async function nudgeStudent(courseId: string, profileId: string): Promise<void> {
  const { data: course } = await supabase
    .from('courses')
    .select('due_in_days')
    .eq('id', courseId)
    .single()
  const dueInDays = course?.due_in_days ?? null
  const dueAt = dueInDays != null ? new Date(Date.now() + dueInDays * 86_400_000).toISOString() : null

  await supabase
    .from('notifications')
    .delete()
    .eq('course_id', courseId)
    .eq('profile_id', profileId)
    .is('dismissed_at', null)

  const { error } = await supabase.from('notifications').insert({
    profile_id: profileId,
    course_id: courseId,
    type: 'reminder' as const,
    due_at: dueAt,
  })
  if (error) throw error
}

import { supabase } from '@/lib/supabase'
import type { LearningPath, Course } from '@/types/database'

export type PathCourse = Course & { position: number }

export async function fetchLearningPaths(): Promise<LearningPath[]> {
  const { data, error } = await supabase.from('learning_paths').select('*').order('created_at')
  if (error) throw error
  return data as LearningPath[]
}

export async function createLearningPath(title: string, description?: string): Promise<LearningPath> {
  const { data, error } = await supabase
    .from('learning_paths')
    .insert({ title, description: description ?? null })
    .select()
    .single()
  if (error) throw error
  return data as LearningPath
}

export async function deleteLearningPath(id: string) {
  const { error } = await supabase.from('learning_paths').delete().eq('id', id)
  if (error) throw error
}

export async function fetchPathCourses(pathId: string): Promise<PathCourse[]> {
  const { data, error } = await supabase
    .from('learning_path_courses')
    .select('position, courses(*)')
    .eq('path_id', pathId)
    .order('position')
  if (error) throw error
  const rows = (data ?? []) as unknown as { position: number; courses: Course }[]
  return rows.filter((r) => r.courses).map((r) => ({ ...r.courses, position: r.position }))
}

export async function addPathCourse(pathId: string, courseId: string) {
  const { data: last } = await supabase
    .from('learning_path_courses')
    .select('position')
    .eq('path_id', pathId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const position = (last?.position ?? 0) + 1
  const { error } = await supabase
    .from('learning_path_courses')
    .insert({ path_id: pathId, course_id: courseId, position })
  if (error) throw error
}

export async function removePathCourse(pathId: string, courseId: string) {
  const { error } = await supabase
    .from('learning_path_courses')
    .delete()
    .eq('path_id', pathId)
    .eq('course_id', courseId)
  if (error) throw error
}

// Enroll every member of the given groups in every course of the path.
export async function assignPathToGroups(pathId: string, groupIds: string[]): Promise<number> {
  if (!groupIds.length) return 0
  const { data: gm } = await supabase.from('group_members').select('profile_id').in('group_id', groupIds)
  const profileIds = [...new Set((gm ?? []).map((r) => r.profile_id))]
  const { data: pc } = await supabase.from('learning_path_courses').select('course_id').eq('path_id', pathId)
  const courseIds = (pc ?? []).map((r) => r.course_id)
  if (!profileIds.length || !courseIds.length) return 0

  const rows = profileIds.flatMap((pid) => courseIds.map((cid) => ({ student_id: pid, course_id: cid })))
  const { error } = await supabase
    .from('enrollments')
    .upsert(rows, { onConflict: 'student_id,course_id', ignoreDuplicates: true })
  if (error) throw error
  return profileIds.length
}

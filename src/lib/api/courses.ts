import { supabase } from '@/lib/supabase'
import type { Course, Module, Lesson, ArticleContent, CourseWithModules } from '@/types/database'

export async function fetchCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Course[]
}

export async function fetchCourseWithModules(courseId: string): Promise<CourseWithModules> {
  const { data, error } = await supabase
    .from('courses')
    .select('*, modules(*, lessons(*))')
    .eq('id', courseId)
    .single()
  if (error) throw error

  const course = data as unknown as CourseWithModules & {
    modules: (Module & { lessons: Lesson[] })[]
  }
  course.modules.sort((a, b) => a.position - b.position)
  course.modules.forEach((m) => m.lessons.sort((a, b) => a.position - b.position))
  return course
}

export async function createCourse(data: { title: string; description?: string; created_by: string }) {
  const { data: course, error } = await supabase
    .from('courses')
    .insert({ ...data, published: false })
    .select()
    .single()
  if (error) throw error
  return course as Course
}

export async function updateCourse(id: string, data: Partial<Course>) {
  const { error } = await supabase.from('courses').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

export async function createModule(data: { course_id: string; title: string; position: number }) {
  const { data: mod, error } = await supabase.from('modules').insert(data).select().single()
  if (error) throw error
  return mod as Module
}

export async function updateModule(id: string, data: Partial<Module>) {
  const { error } = await supabase.from('modules').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteModule(id: string) {
  const { error } = await supabase.from('modules').delete().eq('id', id)
  if (error) throw error
}

export async function createLesson(data: {
  module_id: string
  title: string
  type: 'article' | 'quiz'
  position: number
}) {
  const { data: lesson, error } = await supabase.from('lessons').insert(data).select().single()
  if (error) throw error
  return lesson as Lesson
}

export async function updateLesson(id: string, data: Partial<Lesson>) {
  const { error } = await supabase.from('lessons').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

// Live save without snapshotting a version — used by autosave so the version
// history stays clean (one snapshot per editing session, taken on blur/save).
export async function saveArticleDraft(lessonId: string, content: object) {
  const { error } = await supabase
    .from('article_content')
    .upsert({ lesson_id: lessonId, content }, { onConflict: 'lesson_id' })
  if (error) throw error
}

export async function upsertArticleContent(lessonId: string, content: object) {
  const { error } = await supabase
    .from('article_content')
    .upsert({ lesson_id: lessonId, content }, { onConflict: 'lesson_id' })
  if (error) throw error

  // Snapshot a version — skip if identical to the latest snapshot.
  const { data: latest } = await supabase
    .from('article_content_versions')
    .select('content')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latest && JSON.stringify(latest.content) === JSON.stringify(content)) return

  const { data: userData } = await supabase.auth.getUser()
  await supabase.from('article_content_versions').insert({
    lesson_id: lessonId,
    content,
    created_by: userData.user?.id ?? null,
  })
}

export async function fetchArticleContent(lessonId: string): Promise<ArticleContent | null> {
  const { data } = await supabase
    .from('article_content')
    .select('*')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  return data as ArticleContent | null
}

export async function fetchEnrolledCourses(studentId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('courses(*)')
    .eq('student_id', studentId)
  if (error) throw error
  // filter out nulls: an enrollment can reference a course the student can't
  // read yet (e.g. an unpublished mandatory course hidden by RLS)
  return ((data ?? []).map((e) => e.courses).filter(Boolean)) as unknown as Course[]
}

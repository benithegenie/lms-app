import { supabase } from '@/lib/supabase'
import type { Profile, Enrollment, LessonCompletion } from '@/types/database'

export async function fetchAllStudents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name')
  if (error) throw error
  return data as Profile[]
}

export async function fetchEnrollmentsByCourse(courseId: string) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, profiles(*)')
    .eq('course_id', courseId)
  if (error) throw error
  return data
}

export async function fetchEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
  if (error) throw error
  return data as Enrollment[]
}

export async function enrollStudent(studentId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, course_id: courseId })
  if (error) throw error
}

export async function unenrollStudent(studentId: string, courseId: string) {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('student_id', studentId)
    .eq('course_id', courseId)
  if (error) throw error
}

export async function markLessonComplete(studentId: string, lessonId: string) {
  // completed_at is set explicitly so re-completing (recertification) refreshes
  // the timestamp on conflict — the upsert UPDATE only touches provided columns.
  const { error } = await supabase
    .from('lesson_completions')
    .upsert(
      { student_id: studentId, lesson_id: lessonId, completed_at: new Date().toISOString() },
      { onConflict: 'student_id,lesson_id' },
    )
  if (error) throw error
}

export async function fetchLessonCompletions(studentId: string, courseId: string): Promise<LessonCompletion[]> {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('*, lessons!inner(module_id, modules!inner(course_id))')
    .eq('student_id', studentId)
    .eq('lessons.modules.course_id', courseId)
  if (error) throw error
  return data as LessonCompletion[]
}

export async function fetchAllCompletions(studentId: string): Promise<LessonCompletion[]> {
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('*')
    .eq('student_id', studentId)
  if (error) throw error
  return data as LessonCompletion[]
}

export async function fetchStudentQuizAttemptsByCourse(studentId: string, courseId: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes!inner(lesson_id, lessons!inner(module_id, modules!inner(course_id)))')
    .eq('student_id', studentId)
    .eq('quizzes.lessons.modules.course_id', courseId)
  if (error) throw error
  return data
}

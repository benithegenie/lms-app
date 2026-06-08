import { supabase } from '@/lib/supabase'
import type { Acknowledgement } from '@/types/database'

export async function fetchAcknowledgement(
  studentId: string,
  lessonId: string,
): Promise<Acknowledgement | null> {
  const { data } = await supabase
    .from('acknowledgements')
    .select('*')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  return (data as Acknowledgement) ?? null
}

export async function acknowledgeLesson(studentId: string, lessonId: string): Promise<void> {
  const { error } = await supabase
    .from('acknowledgements')
    .upsert({ student_id: studentId, lesson_id: lessonId }, { onConflict: 'student_id,lesson_id' })
  if (error) throw error
}

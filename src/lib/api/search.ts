import { supabase } from '@/lib/supabase'

export type SearchResult = {
  lessonId: string
  lessonTitle: string
  courseId: string
  courseTitle: string
  snippet: string
}

type Row = {
  lesson_id: string
  search_text: string | null
  lessons: {
    title: string
    modules: { course_id: string; courses: { title: string } | null } | null
  } | null
}

function makeSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text.slice(0, 120) + (text.length > 120 ? '…' : '')
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, start + 140)
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
}

// Searches article content. RLS limits results to the caller's accessible
// (published + enrolled) lessons automatically.
export async function searchLessons(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`

  const { data, error } = await supabase
    .from('article_content')
    .select('lesson_id, search_text, lessons(title, modules(course_id, courses(title)))')
    .ilike('search_text', pattern)
    .limit(25)
  if (error) throw error

  return ((data ?? []) as unknown as Row[])
    .map((r) => ({
      lessonId: r.lesson_id,
      lessonTitle: r.lessons?.title ?? 'Lesson',
      courseId: r.lessons?.modules?.course_id ?? '',
      courseTitle: r.lessons?.modules?.courses?.title ?? '',
      snippet: makeSnippet(r.search_text ?? '', q),
    }))
    .filter((r) => r.courseId)
}

import { supabase } from '@/lib/supabase'
import type { ArticleContentVersion } from '@/types/database'

export type ArticleVersion = ArticleContentVersion & { author: string | null }

export async function fetchArticleVersions(lessonId: string): Promise<ArticleVersion[]> {
  const { data, error } = await supabase
    .from('article_content_versions')
    .select('*, profiles(full_name, email)')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as unknown as (ArticleContentVersion & {
    profiles: { full_name: string | null; email: string } | null
  })[]
  return rows.map((r) => ({
    id: r.id,
    lesson_id: r.lesson_id,
    content: r.content,
    created_by: r.created_by,
    created_at: r.created_at,
    author: r.profiles?.full_name ?? r.profiles?.email ?? null,
  }))
}

import { supabase } from '@/lib/supabase'
import type { Attachment } from '@/types/database'

export async function fetchAttachments(lessonId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at')
  if (error) throw error
  return data as Attachment[]
}

export async function uploadAttachment(lessonId: string, file: File): Promise<Attachment> {
  const ext = file.name.split('.').pop()
  const path = `${lessonId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, file)
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(path)

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      lesson_id: lessonId,
      name: file.name,
      file_url: publicUrl,
      file_size: file.size,
    })
    .select()
    .single()
  if (error) throw error
  return data as Attachment
}

export async function deleteAttachment(attachment: Attachment) {
  const path = new URL(attachment.file_url).pathname.split('/attachments/')[1]
  await supabase.storage.from('attachments').remove([path])
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

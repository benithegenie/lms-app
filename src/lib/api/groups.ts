import { supabase } from '@/lib/supabase'
import type { Group, Profile } from '@/types/database'

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('*').order('name')
  if (error) throw error
  return data as Group[]
}

export async function createGroup(name: string, description?: string): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description: description ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Group
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from('groups').delete().eq('id', id)
  if (error) throw error
}

export async function fetchGroupMembers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('profiles(*)')
    .eq('group_id', groupId)
  if (error) throw error
  const rows = (data ?? []) as unknown as { profiles: Profile }[]
  return rows.map((r) => r.profiles).filter(Boolean)
}

export async function addGroupMember(groupId: string, profileId: string) {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, profile_id: profileId })
  if (error) throw error
}

export async function removeGroupMember(groupId: string, profileId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
  if (error) throw error
}

// Bulk-add existing employees to a group by email (e.g. paste from a CSV).
// Matches registered users; returns how many were added and which weren't found.
export async function bulkAddMembersByEmail(
  groupId: string,
  emails: string[],
): Promise<{ added: number; notFound: string[] }> {
  const cleaned = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (!cleaned.length) return { added: 0, notFound: [] }

  const { data, error } = await supabase.from('profiles').select('id, email').in('email', cleaned)
  if (error) throw error
  const found = (data ?? []) as { id: string; email: string }[]
  const foundEmails = new Set(found.map((p) => p.email.toLowerCase()))
  const notFound = cleaned.filter((e) => !foundEmails.has(e))

  if (found.length) {
    const rows = found.map((p) => ({ group_id: groupId, profile_id: p.id }))
    const { error: insErr } = await supabase
      .from('group_members')
      .upsert(rows, { onConflict: 'group_id,profile_id', ignoreDuplicates: true })
    if (insErr) throw insErr
  }
  return { added: found.length, notFound }
}

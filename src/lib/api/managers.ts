import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

export async function fetchGroupManagers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_managers')
    .select('profiles(*)')
    .eq('group_id', groupId)
  if (error) throw error
  const rows = (data ?? []) as unknown as { profiles: Profile }[]
  return rows.map((r) => r.profiles).filter(Boolean)
}

export async function assignManager(groupId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('group_managers')
    .insert({ group_id: groupId, profile_id: profileId })
  if (error) throw error
  // Promote a plain student to manager (no-op if already admin/manager).
  await supabase.from('profiles').update({ role: 'manager' }).eq('id', profileId).eq('role', 'student')
}

export async function removeManager(groupId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from('group_managers')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
  if (error) throw error
}

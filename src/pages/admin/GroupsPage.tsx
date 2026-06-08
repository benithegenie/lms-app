import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, UserMinus, UserPlus, UsersRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchGroups, createGroup, deleteGroup,
  fetchGroupMembers, addGroupMember, removeGroupMember, bulkAddMembersByEmail,
} from '@/lib/api/groups'
import { fetchGroupManagers, assignManager, removeManager } from '@/lib/api/managers'
import { fetchAllStudents } from '@/lib/api/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function GroupsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [addStudentId, setAddStudentId] = useState('')
  const [addManagerId, setAddManagerId] = useState('')
  const [bulkText, setBulkText] = useState('')

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups })
  const { data: students = [] } = useQuery({ queryKey: ['students'], queryFn: fetchAllStudents })
  const { data: members = [] } = useQuery({
    queryKey: ['group-members', selectedId],
    queryFn: () => fetchGroupMembers(selectedId!),
    enabled: !!selectedId,
  })
  const { data: managers = [] } = useQuery({
    queryKey: ['group-managers', selectedId],
    queryFn: () => fetchGroupManagers(selectedId!),
    enabled: !!selectedId,
  })

  const selected = groups.find((g) => g.id === selectedId) ?? null

  const create = useMutation({
    mutationFn: () => createGroup(newName.trim()),
    onSuccess: (g) => {
      setNewName('')
      qc.invalidateQueries({ queryKey: ['groups'] })
      setSelectedId(g.id)
      toast.success(`Group “${g.name}” created`)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      setSelectedId(null)
    },
  })

  const addMember = useMutation({
    mutationFn: (profileId: string) => addGroupMember(selectedId!, profileId),
    onSuccess: () => {
      setAddStudentId('')
      qc.invalidateQueries({ queryKey: ['group-members', selectedId] })
      toast.success('Member added')
    },
  })

  const removeMember = useMutation({
    mutationFn: (profileId: string) => removeGroupMember(selectedId!, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-members', selectedId] }),
  })

  const bulkAdd = useMutation({
    mutationFn: () => bulkAddMembersByEmail(selectedId!, bulkText.split(/[\s,;]+/)),
    onSuccess: (res) => {
      setBulkText('')
      qc.invalidateQueries({ queryKey: ['group-members', selectedId] })
      toast.success(
        `Added ${res.added}${res.notFound.length ? ` · ${res.notFound.length} email(s) not found` : ''}`,
      )
    },
  })

  const addManager = useMutation({
    mutationFn: (profileId: string) => assignManager(selectedId!, profileId),
    onSuccess: () => {
      setAddManagerId('')
      qc.invalidateQueries({ queryKey: ['group-managers', selectedId] })
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Manager assigned')
    },
  })

  const removeManagerMut = useMutation({
    mutationFn: (profileId: string) => removeManager(selectedId!, profileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-managers', selectedId] }),
  })

  const memberIds = new Set(members.map((m) => m.id))
  const managerIds = new Set(managers.map((m) => m.id))
  const availableStudents = students.filter((s) => !memberIds.has(s.id))
  const availableManagers = students.filter((s) => !managerIds.has(s.id))

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-2">
        <UsersRound className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Groups</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Organize employees into groups (e.g. “Sales Team”). Mandatory courses get assigned to groups.
      </p>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
        {/* Left: list + create */}
        <Card>
          <CardHeader><CardTitle>All groups</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create.mutate() }}
            >
              <Input
                placeholder="New group name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button type="submit" disabled={!newName.trim() || create.isPending}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>

            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet. Create one above.</p>
            ) : (
              <ul className="space-y-1">
                {groups.map((g) => (
                  <li key={g.id}>
                    <button
                      onClick={() => setSelectedId(g.id)}
                      className={`w-full px-3 py-2 rounded-md text-sm text-left font-medium ${
                        g.id === selectedId
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right: members of selected group */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{selected ? selected.name : 'Select a group'}</CardTitle>
            {selected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(selected.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" /> Delete
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Pick a group on the left to manage its members.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select value={addStudentId} onValueChange={setAddStudentId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add a student…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.length === 0 ? (
                        <SelectItem value="__none" disabled>No more students</SelectItem>
                      ) : (
                        availableStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name ?? s.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addStudentId && addMember.mutate(addStudentId)}
                    disabled={!addStudentId || addStudentId === '__none' || addMember.isPending}
                  >
                    <UserPlus className="h-4 w-4" /> Add
                  </Button>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Bulk add by email (paste a list)</summary>
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="w-full border rounded-md p-2 text-sm h-20"
                      placeholder={'alice@company.com\nbob@company.com'}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkAdd.mutate()}
                      disabled={!bulkText.trim() || bulkAdd.isPending}
                    >
                      {bulkAdd.isPending ? 'Adding…' : 'Add all'}
                    </Button>
                  </div>
                </details>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Members</span>
                  <Badge variant="outline">{members.length}</Badge>
                </div>

                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between border rounded-md px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{m.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeMember.mutate(m.id)}
                          disabled={removeMember.isPending}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Managers — see compliance for this group only */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium mt-2">Managers</span>
                  <Badge variant="outline" className="mt-2">{managers.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Managers see compliance for this group’s members only (not the whole org).
                </p>
                <div className="flex gap-2">
                  <Select value={addManagerId} onValueChange={setAddManagerId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Make someone a manager…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableManagers.length === 0 ? (
                        <SelectItem value="__none" disabled>No students available</SelectItem>
                      ) : (
                        availableManagers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.email}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addManagerId && addManager.mutate(addManagerId)}
                    disabled={!addManagerId || addManagerId === '__none' || addManager.isPending}
                  >
                    <ShieldCheck className="h-4 w-4" /> Add
                  </Button>
                </div>
                {managers.length > 0 && (
                  <ul className="space-y-2">
                    {managers.map((m) => (
                      <li key={m.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{m.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeManagerMut.mutate(m.id)}
                          disabled={removeManagerMut.isPending}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

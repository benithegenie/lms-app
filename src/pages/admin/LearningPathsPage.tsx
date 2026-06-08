import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ListOrdered, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchLearningPaths, createLearningPath, deleteLearningPath,
  fetchPathCourses, addPathCourse, removePathCourse, assignPathToGroups,
} from '@/lib/api/paths'
import { fetchCourses } from '@/lib/api/courses'
import { fetchGroups } from '@/lib/api/groups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export function LearningPathsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [addCourseId, setAddCourseId] = useState('')
  const [groupSel, setGroupSel] = useState<Set<string>>(new Set())

  const { data: paths = [] } = useQuery({ queryKey: ['learning-paths'], queryFn: fetchLearningPaths })
  const { data: allCourses = [] } = useQuery({ queryKey: ['admin', 'courses'], queryFn: fetchCourses })
  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups })
  const { data: pathCourses = [] } = useQuery({
    queryKey: ['path-courses', selectedId],
    queryFn: () => fetchPathCourses(selectedId!),
    enabled: !!selectedId,
  })

  const selected = paths.find((p) => p.id === selectedId) ?? null

  const create = useMutation({
    mutationFn: () => createLearningPath(newTitle.trim()),
    onSuccess: (p) => {
      setNewTitle('')
      qc.invalidateQueries({ queryKey: ['learning-paths'] })
      setSelectedId(p.id)
      toast.success('Path created')
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteLearningPath(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['learning-paths'] }); setSelectedId(null) },
  })
  const addCourse = useMutation({
    mutationFn: (courseId: string) => addPathCourse(selectedId!, courseId),
    onSuccess: () => { setAddCourseId(''); qc.invalidateQueries({ queryKey: ['path-courses', selectedId] }) },
  })
  const removeCourse = useMutation({
    mutationFn: (courseId: string) => removePathCourse(selectedId!, courseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['path-courses', selectedId] }),
  })
  const assign = useMutation({
    mutationFn: () => assignPathToGroups(selectedId!, Array.from(groupSel)),
    onSuccess: (count) => toast.success(`Enrolled ${count} employee${count === 1 ? '' : 's'} in this path`),
  })

  const pathCourseIds = new Set(pathCourses.map((c) => c.id))
  const availableCourses = allCourses.filter((c) => !pathCourseIds.has(c.id))

  function toggleGroup(id: string) {
    setGroupSel((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-2">
        <ListOrdered className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Learning paths</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Sequence courses into an ordered track (e.g. a Day 1–30 onboarding path), then assign it to a group.
      </p>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
        {/* Left: list + create */}
        <Card>
          <CardHeader><CardTitle>All paths</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) create.mutate() }}
            >
              <Input placeholder="New path name…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <Button type="submit" disabled={!newTitle.trim() || create.isPending}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </form>
            {paths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paths yet.</p>
            ) : (
              <ul className="space-y-1">
                {paths.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full px-3 py-2 rounded-md text-sm text-left font-medium ${
                        p.id === selectedId ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right: sequence + assign */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{selected ? selected.title : 'Select a path'}</CardTitle>
            {selected && (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(selected.id)} disabled={remove.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" /> Delete
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground">Pick a path to sequence its courses.</p>
            ) : (
              <div className="space-y-4">
                <ol className="space-y-2">
                  {pathCourses.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3 border rounded-md px-3 py-2">
                      <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm font-medium">{c.title}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCourse.mutate(c.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                  {pathCourses.length === 0 && (
                    <p className="text-sm text-muted-foreground">No courses yet — add some below.</p>
                  )}
                </ol>

                <div className="flex gap-2">
                  <Select value={addCourseId} onValueChange={setAddCourseId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Add a course…" /></SelectTrigger>
                    <SelectContent>
                      {availableCourses.length === 0 ? (
                        <SelectItem value="__none" disabled>No more courses</SelectItem>
                      ) : (
                        availableCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addCourseId && addCourse.mutate(addCourseId)}
                    disabled={!addCourseId || addCourseId === '__none' || addCourse.isPending}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-medium">Assign path to groups</p>
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No groups yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                      {groups.map((g) => (
                        <label key={g.id} className="flex items-center gap-2 text-sm px-1 py-0.5">
                          <input type="checkbox" className="h-4 w-4" checked={groupSel.has(g.id)} onChange={() => toggleGroup(g.id)} />
                          {g.name}
                        </label>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => assign.mutate()}
                    disabled={assign.isPending || groupSel.size === 0 || pathCourses.length === 0}
                  >
                    {assign.isPending ? 'Assigning…' : 'Assign now'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

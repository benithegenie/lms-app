import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '@/types/database'
import { fetchGroups } from '@/lib/api/groups'
import {
  fetchRequiredGroupIds, setRequiredGroups, updateCourseMandatory, assignMandatoryCourse,
} from '@/lib/api/compliance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'

export function MandatoryDialog({ course }: { course: Course }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [isMandatory, setIsMandatory] = useState(course.is_mandatory)
  const [dueDays, setDueDays] = useState(course.due_in_days != null ? String(course.due_in_days) : '30')
  const [recertDays, setRecertDays] = useState(course.recert_interval_days != null ? String(course.recert_interval_days) : '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [assignResult, setAssignResult] = useState<number | null>(null)

  const { data: groups = [] } = useQuery({ queryKey: ['groups'], queryFn: fetchGroups, enabled: open })
  const { data: requiredIds = [] } = useQuery({
    queryKey: ['required-groups', course.id],
    queryFn: () => fetchRequiredGroupIds(course.id),
    enabled: open,
  })

  // mirror the saved group selection into local checkbox state when it loads
  useEffect(() => {
    setSelected(new Set(requiredIds))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredIds.join(',')])

  const dueInDays = () => (dueDays.trim() && Number.isFinite(+dueDays) ? parseInt(dueDays, 10) : null)
  const recertInterval = () => (recertDays.trim() && Number.isFinite(+recertDays) ? parseInt(recertDays, 10) : null)

  const save = useMutation({
    mutationFn: async () => {
      await updateCourseMandatory(course.id, { is_mandatory: isMandatory, due_in_days: dueInDays(), recert_interval_days: recertInterval() })
      await setRequiredGroups(course.id, Array.from(selected))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })

  // Assign always persists current settings first, then enrolls + notifies
  const assign = useMutation({
    mutationFn: async () => {
      await updateCourseMandatory(course.id, { is_mandatory: isMandatory, due_in_days: dueInDays(), recert_interval_days: recertInterval() })
      await setRequiredGroups(course.id, Array.from(selected))
      return assignMandatoryCourse(course.id)
    },
    onSuccess: (count) => {
      setAssignResult(count)
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      toast.success(`Assigned to ${count} employee${count === 1 ? '' : 's'}`)
    },
  })

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setAssignResult(null) }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Required-course settings">
          <ShieldCheck className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Required course settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {!course.published && (
            <p className="text-xs rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
              Publish this course before assigning — employees can’t open an unpublished course.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
            />
            Make this a required (mandatory) course
          </label>

          <div className="space-y-2">
            <Label>Due within (days)</Label>
            <Input
              type="number"
              min={1}
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="space-y-2">
            <Label>Recertify every (days, optional)</Label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 365 — blank = never expires"
              value={recertDays}
              onChange={(e) => setRecertDays(e.target.value)}
              className="w-64"
            />
            <p className="text-xs text-muted-foreground">
              After this many days a completed certification expires and the employee must pass the quiz again.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Required for these groups</Label>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet — create groups first.</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm px-1 py-0.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(g.id)}
                      onChange={() => toggleGroup(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => assign.mutate()}
              disabled={assign.isPending || !isMandatory || selected.size === 0}
              title={!isMandatory || selected.size === 0 ? 'Mark mandatory and pick at least one group first' : 'Enroll group members and notify them'}
            >
              {assign.isPending ? 'Assigning…' : 'Assign now'}
            </Button>
          </div>

          {assignResult !== null && (
            <p className="text-sm text-green-700">
              ✓ Assigned to {assignResult} employee{assignResult === 1 ? '' : 's'}.
            </p>
          )}
          {save.isSuccess && (
            <p className="text-xs text-muted-foreground">Settings saved.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

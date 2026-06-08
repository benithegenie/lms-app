import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Download, Bell } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchMandatoryCourses, fetchCourseCompliance, nudgeStudent,
} from '@/lib/api/compliance'
import type { ComplianceRow, ComplianceStatus } from '@/lib/api/compliance'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

function StatusBadge({ status }: { status: ComplianceStatus }) {
  if (status === 'complete') return <Badge variant="success">Complete</Badge>
  if (status === 'overdue') return <Badge variant="destructive">Overdue</Badge>
  return <Badge variant="secondary">In progress</Badge>
}

function exportCsv(title: string, rows: ComplianceRow[]) {
  const header = ['Name', 'Email', 'Completed', 'Total', 'Status', 'Due', 'Certified until']
  const body = rows.map((r) => [
    r.student.full_name ?? '', r.student.email, String(r.completed), String(r.total), r.status, r.dueAt ?? '', r.expiresAt ?? '',
  ])
  const csv = [header, ...body]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-compliance.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function CompliancePage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [onlyNonCompliant, setOnlyNonCompliant] = useState(true)

  const { data: courses = [] } = useQuery({
    queryKey: ['mandatory-courses'],
    queryFn: fetchMandatoryCourses,
  })

  const courseId = selectedId ?? courses[0]?.id ?? null
  const selectedCourse = courses.find((c) => c.id === courseId) ?? null

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['course-compliance', courseId],
    queryFn: () => fetchCourseCompliance(courseId!),
    enabled: !!courseId,
  })

  const nudge = useMutation({
    mutationFn: (profileId: string) => nudgeStudent(courseId!, profileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-compliance', courseId] })
      toast.success('Reminder re-issued')
    },
  })

  const summary = useMemo(() => ({
    assigned: rows.length,
    complete: rows.filter((r) => r.status === 'complete').length,
    overdue: rows.filter((r) => r.status === 'overdue').length,
  }), [rows])

  const visible = onlyNonCompliant ? rows.filter((r) => r.status !== 'complete') : rows

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Compliance</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Track who has completed each required course. Overdue = past deadline and not yet passed.
      </p>

      {courses.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No required courses yet</p>
          <p className="text-sm">Open a course’s 🛡 settings and mark it required to track it here.</p>
        </div>
      ) : (
        <>
          {/* Course selector */}
          <div className="flex flex-wrap gap-2 mb-6">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  c.id === courseId
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-xl">
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold">{summary.assigned}</p>
              <p className="text-xs text-muted-foreground">Assigned</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-green-700">{summary.complete}</p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </CardContent></Card>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyNonCompliant}
                onChange={(e) => setOnlyNonCompliant(e.target.checked)}
              />
              Show only non-compliant
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedCourse && exportCsv(selectedCourse.title, rows)}
              disabled={rows.length === 0}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading…</p>
              ) : visible.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {rows.length === 0 ? 'Nobody is assigned this course yet.' : 'Everyone is compliant. 🎉'}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Employee</th>
                      <th className="px-4 py-2 font-medium">Progress</th>
                      <th className="px-4 py-2 font-medium">Due</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr key={r.student.id} className="border-b last:border-0">
                        <td className="px-4 py-2">
                          <p className="font-medium">{r.student.full_name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{r.student.email}</p>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{r.completed}/{r.total}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {r.expiresAt
                            ? `cert. until ${formatDate(r.expiresAt)}`
                            : r.dueAt ? formatDate(r.dueAt) : '—'}
                        </td>
                        <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-2 text-right">
                          {r.status !== 'complete' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => nudge.mutate(r.student.id)}
                              disabled={nudge.isPending}
                              title="Re-issue reminder + reset deadline"
                            >
                              <Bell className="h-4 w-4" /> Nudge
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

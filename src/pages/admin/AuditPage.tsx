import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { fetchAuditLog, type AuditRow } from '@/lib/api/audit'
import { Card, CardContent } from '@/components/ui/card'

const EVENT_LABEL: Record<string, string> = {
  lesson_completed: 'Completed lesson',
  quiz_submitted: 'Submitted quiz',
  acknowledged: 'Acknowledged',
  enrolled: 'Assigned / enrolled',
}

function detailText(r: AuditRow): string {
  const d = r.detail
  if (d && 'passed' in d) return `${d.score}/${d.max_score} — ${d.passed ? 'passed' : 'failed'}`
  return ''
}

export function AuditPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => fetchAuditLog(),
  })

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-2">
        <ScrollText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Audit log</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        Tamper-resistant record of compliance events (written by the database, most recent first).
      </p>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Who</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Course</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{r.who}</td>
                    <td className="px-4 py-2">{EVENT_LABEL[r.event] ?? r.event}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.courseTitle ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{detailText(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchPendingMandatory } from '@/lib/api/compliance'

export function MandatoryBanner() {
  const { user } = useAuth()

  const { data: pending = [] } = useQuery({
    queryKey: ['mandatory-pending', user?.id],
    queryFn: () => fetchPendingMandatory(user!.id),
    enabled: !!user,
  })

  if (pending.length === 0) return null

  const overdue = pending.some((p) => p.dueLabel.includes('overdue'))

  return (
    <section
      role="region"
      aria-label={overdue ? 'Overdue required courses' : 'Required courses'}
      aria-live="polite"
      className={`border-b px-6 py-3 ${
        overdue ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 mt-0.5 ${overdue ? 'text-red-600' : 'text-amber-600'}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${overdue ? 'text-red-900' : 'text-amber-900'}`}>
            You have {pending.length} required course{pending.length > 1 ? 's' : ''} to complete
          </p>
          <ul className="mt-1 space-y-1">
            {pending.map((p) => (
              <li key={p.course.id} className="flex items-center gap-2 text-sm flex-wrap">
                <Link
                  to={`/dashboard/course/${p.course.id}`}
                  className={`inline-flex items-center gap-1 font-medium underline ${
                    overdue ? 'text-red-900' : 'text-amber-900'
                  }`}
                >
                  {p.kind === 'recert' ? 'Recertify: ' : ''}{p.course.title}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                {p.dueLabel && (
                  <span className={overdue ? 'text-red-700' : 'text-amber-700'}>
                    — {p.dueLabel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

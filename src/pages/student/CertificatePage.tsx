import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Award, Printer } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchCourseWithModules } from '@/lib/api/courses'
import { fetchAllCompletions } from '@/lib/api/students'
import { Button } from '@/components/ui/button'

export function CertificatePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()

  const { data: course } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => fetchCourseWithModules(courseId!),
    enabled: !!courseId,
  })
  const { data: completions = [] } = useQuery({
    queryKey: ['student', 'completions', profile?.id],
    queryFn: () => fetchAllCompletions(profile!.id),
    enabled: !!profile,
  })

  if (!course) return <div className="p-8 text-muted-foreground">Loading…</div>

  const lessonIds = course.modules.flatMap((m) => m.lessons).map((l) => l.id)
  const times = completions
    .filter((c) => lessonIds.includes(c.lesson_id))
    .map((c) => new Date(c.completed_at).getTime())
  const complete = lessonIds.length > 0 && times.length >= lessonIds.length

  if (!complete) {
    return (
      <div className="p-8 max-w-3xl mx-auto text-muted-foreground">
        Finish this course to unlock your certificate.
      </div>
    )
  }

  const completedAt = new Date(Math.max(...times))
  const expiresAt =
    course.recert_interval_days != null
      ? new Date(completedAt.getTime() + course.recert_interval_days * 86_400_000)
      : null

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      <div className="border-4 border-primary/20 rounded-lg p-12 text-center bg-white text-slate-900">
        <Award className="h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Certificate of Completion
        </p>
        <p className="mt-8 text-slate-500">This certifies that</p>
        <p className="text-3xl font-bold mt-2">{profile?.full_name ?? profile?.email}</p>
        <p className="mt-6 text-slate-500">has successfully completed</p>
        <p className="text-xl font-semibold mt-2">{course.title}</p>
        <p className="mt-8 text-sm text-slate-500">
          Completed on {completedAt.toLocaleDateString()}
        </p>
        {expiresAt && (
          <p className="text-sm text-slate-500">Valid until {expiresAt.toLocaleDateString()}</p>
        )}
      </div>
    </div>
  )
}

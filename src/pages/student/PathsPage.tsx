import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ListOrdered, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { fetchLearningPaths } from '@/lib/api/paths'
import { fetchEnrolledCourses } from '@/lib/api/courses'
import { fetchAllCompletions } from '@/lib/api/students'
import type { Course } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function PathsPage() {
  const { user } = useAuth()

  const { data: paths = [] } = useQuery({ queryKey: ['learning-paths'], queryFn: fetchLearningPaths })
  const { data: enrolled = [] } = useQuery({
    queryKey: ['student', 'courses', user?.id],
    queryFn: () => fetchEnrolledCourses(user!.id),
    enabled: !!user,
  })
  const { data: completions = [] } = useQuery({
    queryKey: ['student', 'completions', user?.id],
    queryFn: () => fetchAllCompletions(user!.id),
    enabled: !!user,
  })
  const { data: pathCourses = [] } = useQuery({
    queryKey: ['all-path-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('learning_path_courses')
        .select('path_id, position, courses(*)')
        .order('position')
      return (data ?? []) as unknown as { path_id: string; position: number; courses: Course | null }[]
    },
  })
  const { data: courseLessonIds = {} } = useQuery({
    queryKey: ['course-lesson-ids', enrolled.map((c) => c.id).join(',')],
    queryFn: async () => {
      const result: Record<string, string[]> = {}
      await Promise.all(
        enrolled.map(async (course) => {
          const { data: modules } = await supabase.from('modules').select('id').eq('course_id', course.id)
          const moduleIds = (modules ?? []).map((m) => m.id)
          if (!moduleIds.length) { result[course.id] = []; return }
          const { data: lessons } = await supabase.from('lessons').select('id').in('module_id', moduleIds)
          result[course.id] = (lessons ?? []).map((l) => l.id)
        }),
      )
      return result
    },
    enabled: enrolled.length > 0,
  })

  const enrolledIds = new Set(enrolled.map((c) => c.id))
  const completedSet = new Set(completions.map((c) => c.lesson_id))

  const byPath = new Map<string, { course: Course; position: number }[]>()
  for (const r of pathCourses) {
    if (!r.courses) continue
    const arr = byPath.get(r.path_id) ?? []
    arr.push({ course: r.courses, position: r.position })
    byPath.set(r.path_id, arr)
  }

  const myPaths = paths.filter((p) => (byPath.get(p.id) ?? []).some((pc) => enrolledIds.has(pc.course.id)))

  function progressFor(courseId: string) {
    const ids = courseLessonIds[courseId] ?? []
    if (!ids.length) return 0
    return Math.round((ids.filter((id) => completedSet.has(id)).length / ids.length) * 100)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <ListOrdered className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Learning paths</h1>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">Your onboarding and training tracks, in order.</p>

      {myPaths.length === 0 ? (
        <p className="text-muted-foreground">You’re not on any learning path yet.</p>
      ) : (
        <div className="space-y-6">
          {myPaths.map((path) => {
            const courses = (byPath.get(path.id) ?? []).sort((a, b) => a.position - b.position)
            return (
              <Card key={path.id}>
                <CardHeader><CardTitle>{path.title}</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {courses.map(({ course }, i) => {
                      const pct = progressFor(course.id)
                      const done = pct === 100
                      return (
                        <li key={course.id} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                          )}
                          <Link
                            to={`/dashboard/course/${course.id}`}
                            className="flex-1 font-medium hover:underline"
                          >
                            {course.title}
                          </Link>
                          <div className="w-28">
                            <Progress value={pct} className="h-2" />
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

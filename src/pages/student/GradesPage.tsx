import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { fetchEnrolledCourses } from '@/lib/api/courses'
import { fetchAllCompletions } from '@/lib/api/students'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'

export function GradesPage() {
  const { user } = useAuth()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['student', 'courses', user?.id],
    queryFn: () => fetchEnrolledCourses(user!.id),
    enabled: !!user,
  })

  const { data: attempts = [] } = useQuery({
    queryKey: ['student', 'all-attempts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('quiz_attempts')
        .select('*, quizzes(lesson_id, pass_score, lessons(title, module_id, modules(course_id)))')
        .eq('student_id', user!.id)
        .order('submitted_at', { ascending: false })
      return data ?? []
    },
    enabled: !!user,
  })

  const { data: completions = [] } = useQuery({
    queryKey: ['student', 'completions', user?.id],
    queryFn: () => fetchAllCompletions(user!.id),
    enabled: !!user,
  })

  // Fetch the lesson IDs that belong to each course (via modules)
  const { data: courseLessonIds = {} } = useQuery({
    queryKey: ['course-lesson-ids', courses.map((c) => c.id).join(',')],
    queryFn: async () => {
      const result: Record<string, string[]> = {}
      await Promise.all(
        courses.map(async (course) => {
          const { data: modules } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', course.id)
          const moduleIds = (modules ?? []).map((m: { id: string }) => m.id)
          if (!moduleIds.length) { result[course.id] = []; return }
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .in('module_id', moduleIds)
          result[course.id] = (lessons ?? []).map((l: { id: string }) => l.id)
        })
      )
      return result
    },
    enabled: courses.length > 0,
  })

  const completedSet = new Set(completions.map((c) => c.lesson_id))

  const attemptsByCourse: Record<string, typeof attempts> = {}
  for (const a of attempts) {
    const moduleRecord = (a.quizzes as unknown as { lessons: { modules: { course_id: string } } })?.lessons?.modules
    const courseId = moduleRecord?.course_id
    if (courseId) {
      if (!attemptsByCourse[courseId]) attemptsByCourse[courseId] = []
      attemptsByCourse[courseId].push(a)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">My Results</h1>
      <p className="text-muted-foreground mb-8">Your training progress and quiz results</p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground">No enrolled courses.</p>
      ) : (
        <div className="space-y-6">
          {courses.map((course) => {
            const lessonIds = courseLessonIds[course.id] ?? []
            const total = lessonIds.length
            const completed = lessonIds.filter((id) => completedSet.has(id)).length
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0
            const courseAttempts = attemptsByCourse[course.id] ?? []

            return (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <div className="flex items-center gap-3">
                      {progress === 100 && (
                        <Link
                          to={`/dashboard/certificate/${course.id}`}
                          className="text-xs text-primary underline whitespace-nowrap"
                        >
                          Certificate
                        </Link>
                      )}
                      <Badge variant="outline">{progress}% complete</Badge>
                    </div>
                  </div>
                  <Progress value={progress} className="mt-2 h-2" />
                </CardHeader>
                <CardContent>
                  {courseAttempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quizzes taken yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-muted-foreground border-b">
                          <th className="text-left py-2 font-medium">Quiz</th>
                          <th className="text-center py-2 font-medium">Score</th>
                          <th className="text-center py-2 font-medium">Result</th>
                          <th className="text-right py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseAttempts.map((a) => {
                          const q = a.quizzes as unknown as { lesson_id: string; pass_score: number; lessons: { title: string } }
                          const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                          const passed = pct >= (q?.pass_score ?? 70)
                          return (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="py-2">{q?.lessons?.title ?? 'Quiz'}</td>
                              <td className="py-2 text-center font-mono">{a.score}/{a.max_score} ({pct}%)</td>
                              <td className="py-2 text-center">
                                <Badge variant={passed ? 'success' : 'destructive'}>
                                  {passed ? 'Passed' : 'Failed'}
                                </Badge>
                              </td>
                              <td className="py-2 text-right text-muted-foreground">
                                {formatDate(a.submitted_at)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

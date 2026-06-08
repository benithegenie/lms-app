import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchEnrolledCourses } from '@/lib/api/courses'
import { fetchAllCompletions } from '@/lib/api/students'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

export function MyCoursesPage() {
  const { user } = useAuth()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['student', 'courses', user?.id],
    queryFn: () => fetchEnrolledCourses(user!.id),
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

  function progressForCourse(courseId: string) {
    const lessonIds = courseLessonIds[courseId] ?? []
    const total = lessonIds.length
    if (!total) return 0
    const completed = lessonIds.filter((id) => completedSet.has(id)).length
    return Math.round((completed / total) * 100)
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">My Courses</h1>
      <p className="text-muted-foreground mb-8">Your assigned training</p>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No training assigned yet</p>
          <p className="text-sm">Ask your admin or HR to enroll you in a course.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course.id} to={`/dashboard/course/${course.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg leading-tight">{course.title}</CardTitle>
                    <Badge variant="outline" className="ml-2 shrink-0">Enrolled</Badge>
                  </div>
                  {course.description && (
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{progressForCourse(course.id)}%</span>
                    </div>
                    <Progress value={progressForCourse(course.id)} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

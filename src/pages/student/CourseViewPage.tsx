import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Circle, FileText, HelpCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchCourseWithModules } from '@/lib/api/courses'
import { fetchAllCompletions } from '@/lib/api/students'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function CourseViewPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: course, isLoading } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => fetchCourseWithModules(courseId!),
    enabled: !!courseId,
  })

  const { data: completions = [] } = useQuery({
    queryKey: ['student', 'completions', user?.id],
    queryFn: () => fetchAllCompletions(user!.id),
    enabled: !!user,
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!course) return <div className="p-8 text-muted-foreground">Course not found.</div>

  const completedSet = new Set(completions.map((c) => c.lesson_id))
  const allLessons = course.modules.flatMap((m) => m.lessons)
  const completedCount = allLessons.filter((l) => completedSet.has(l.id)).length
  const progress = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

  const firstLesson = allLessons[0]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3 w-3" /> My Courses
      </Link>

      <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
      {course.description && <p className="text-muted-foreground mb-6">{course.description}</p>}

      <div className="mb-8 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{completedCount} of {allLessons.length} lessons completed</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {firstLesson && progress === 0 && (
        <Button className="mb-8" onClick={() => navigate(`/dashboard/course/${courseId}/lesson/${firstLesson.id}`)}>
          Start Course
        </Button>
      )}

      <div className="space-y-6">
        {course.modules.map((mod) => (
          <div key={mod.id}>
            <h2 className="font-semibold text-lg mb-3">{mod.title}</h2>
            <div className="space-y-1">
              {mod.lessons.map((lesson) => {
                const done = completedSet.has(lesson.id)
                return (
                  <Link
                    key={lesson.id}
                    to={`/dashboard/course/${courseId}/lesson/${lesson.id}`}
                    aria-label={`${lesson.title}, ${lesson.type}, ${done ? 'completed' : 'not started'}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      done ? 'bg-green-50 border-green-200' : 'hover:bg-muted',
                    )}
                  >
                    {done
                      ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                      : <Circle className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    }
                    <span className={cn('flex-1', done && 'text-green-800')}>{lesson.title}</span>
                    {lesson.type === 'quiz'
                      ? <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      : <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    }
                  </Link>
                )
              })}
            </div>
            <Separator className="mt-6" />
          </div>
        ))}
      </div>
    </div>
  )
}

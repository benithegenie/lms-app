import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import {
  fetchCourseWithModules,
  createModule, deleteModule,
  createLesson, deleteLesson, updateCourse,
} from '@/lib/api/courses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LessonEditor } from './LessonEditor'

export function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const qc = useQueryClient()
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['admin', 'course', courseId],
    queryFn: () => fetchCourseWithModules(courseId!),
    enabled: !!courseId,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'course', courseId] })

  const addModule = useMutation({
    mutationFn: () =>
      createModule({
        course_id: courseId!,
        title: newModuleTitle,
        position: (course?.modules.length ?? 0) + 1,
      }),
    onSuccess: () => { invalidate(); setNewModuleTitle(''); setAddingModule(false) },
  })

  const removeModule = useMutation({
    mutationFn: deleteModule,
    onSuccess: invalidate,
  })

  const addLesson = useMutation({
    mutationFn: ({ moduleId, type }: { moduleId: string; type: 'article' | 'quiz' }) => {
      const module = course!.modules.find((m) => m.id === moduleId)!
      return createLesson({
        module_id: moduleId,
        title: type === 'article' ? 'New Lesson' : 'New Quiz',
        type,
        position: module.lessons.length + 1,
      })
    },
    onSuccess: (lesson) => { invalidate(); setSelectedLessonId(lesson.id) },
  })

  const removeLesson = useMutation({
    mutationFn: deleteLesson,
    onSuccess: () => { invalidate(); setSelectedLessonId(null) },
  })

  const togglePublish = useMutation({
    mutationFn: () => updateCourse(courseId!, { published: !course?.published }),
    onSuccess: invalidate,
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!course) return <div className="p-8 text-muted-foreground">Course not found.</div>

  const selectedLesson = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === selectedLessonId)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r bg-card flex flex-col overflow-y-auto">
        <div className="p-4 border-b">
          <Link to="/admin/courses" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-3 w-3" /> Back to courses
          </Link>
          <h2 className="font-semibold text-sm truncate">{course.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={course.published ? 'success' : 'secondary'} className="text-xs">
              {course.published ? 'Published' : 'Draft'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => togglePublish.mutate()}
            >
              {course.published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>

        <div className="flex-1 p-3 space-y-2">
          {course.modules.map((mod) => (
            <div key={mod.id} className="rounded-md border bg-muted/30">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium truncate">{mod.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeModule.mutate(mod.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <Separator />
              <div className="p-1 space-y-0.5">
                {mod.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded text-xs group ${
                      selectedLessonId === lesson.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{lesson.title}</span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 ${selectedLessonId === lesson.id ? 'border-primary-foreground/50 text-primary-foreground' : ''}`}
                      >
                        {lesson.type}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeLesson.mutate(lesson.id) }}
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </button>
                ))}
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs flex-1"
                    onClick={() => addLesson.mutate({ moduleId: mod.id, type: 'article' })}
                  >
                    <Plus className="h-3 w-3" /> Article
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs flex-1"
                    onClick={() => addLesson.mutate({ moduleId: mod.id, type: 'quiz' })}
                  >
                    <Plus className="h-3 w-3" /> Quiz
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {addingModule ? (
            <form
              onSubmit={(e) => { e.preventDefault(); addModule.mutate() }}
              className="flex gap-2"
            >
              <Input
                placeholder="Module title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                autoFocus
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" className="h-8">
                <Save className="h-3 w-3" />
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingModule(true)}>
              <Plus className="h-4 w-4" /> Add module
            </Button>
          )}
        </div>
      </aside>

      {/* Editor area */}
      <main className="flex-1 overflow-y-auto bg-card">
        {selectedLesson ? (
          <LessonEditor
            lesson={selectedLesson}
            onTitleSave={invalidate}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a lesson to edit, or create one in a module.
          </div>
        )}
      </main>
    </div>
  )
}

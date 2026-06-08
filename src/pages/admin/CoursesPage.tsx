import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { fetchCourses, createCourse, deleteCourse, updateCourse } from '@/lib/api/courses'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { MandatoryDialog } from './MandatoryDialog'

export function CoursesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: fetchCourses,
  })

  const createMutation = useMutation({
    mutationFn: () => createCourse({ title, description, created_by: user!.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      setOpen(false)
      setTitle('')
      setDescription('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      updateCourse(id, { published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'courses'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground mt-1">Create and manage your courses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> New course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create new course</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
              className="space-y-4 mt-2"
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Introduction to React"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What students will learn…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create course'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg font-medium">No courses yet</p>
          <p className="text-sm">Create your first course to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/admin/courses/${course.id}`}
                      className="font-display font-semibold text-lg leading-snug hover:text-primary"
                    >
                      {course.title}
                    </Link>
                    <Badge variant={course.published ? 'success' : 'secondary'}>
                      {course.published ? 'Published' : 'Draft'}
                    </Badge>
                    {course.is_mandatory && (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                        Required
                      </Badge>
                    )}
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublish.mutate({ id: course.id, published: !course.published })}
                    title={course.published ? 'Unpublish' : 'Publish'}
                    aria-label={`${course.published ? 'Unpublish' : 'Publish'} ${course.title}`}
                  >
                    {course.published ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </Button>
                  <MandatoryDialog course={course} />
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/courses/${course.id}`} aria-label={`Edit ${course.title}`} title="Edit">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Delete ${course.title}`} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete course?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{course.title}" and all its modules, lessons, and student data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(course.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

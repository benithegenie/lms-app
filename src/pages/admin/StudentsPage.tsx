import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, UserMinus } from 'lucide-react'
import { fetchAllStudents, enrollStudent, unenrollStudent, fetchEnrollmentsByStudent } from '@/lib/api/students'
import { fetchCourses } from '@/lib/api/courses'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types/database'

export function StudentsPage() {
  const qc = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin', 'students-list'],
    queryFn: fetchAllStudents,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: fetchCourses,
  })

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin', 'enrollments', selectedStudent?.id],
    queryFn: () => fetchEnrollmentsByStudent(selectedStudent!.id),
    enabled: !!selectedStudent,
  })

  const [courseToEnroll, setCourseToEnroll] = useState('')

  const enroll = useMutation({
    mutationFn: () => enrollStudent(selectedStudent!.id, courseToEnroll),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', selectedStudent?.id] })
      setCourseToEnroll('')
    },
  })

  const unenroll = useMutation({
    mutationFn: (courseId: string) => unenrollStudent(selectedStudent!.id, courseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments', selectedStudent?.id] }),
  })

  const enrolledCourseIds = new Set(enrollments.map((e) => e.course_id))
  const unenrolledCourses = courses.filter((c) => !enrolledCourseIds.has(c.id))

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Employees</h1>
      <p className="text-muted-foreground mb-8">Manage employees and assign training</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Employee list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All employees ({students.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {students.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">No employees registered yet.</p>
            )}
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                  selectedStudent?.id === student.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
              >
                <div>
                  <p className="font-medium">{student.full_name ?? '(no name)'}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(student.created_at)}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Enrollment panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedStudent
                ? `${selectedStudent.full_name ?? selectedStudent.email}'s enrollments`
                : 'Select a student'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <p className="text-sm text-muted-foreground">Click a student on the left to manage their courses.</p>
            ) : (
              <div className="space-y-4">
                {/* Enroll form */}
                {unenrolledCourses.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={courseToEnroll} onValueChange={setCourseToEnroll}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Enroll in course…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unenrolledCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => enroll.mutate()}
                      disabled={!courseToEnroll || enroll.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Enrolled courses */}
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enrolled in any courses.</p>
                ) : (
                  <ul className="space-y-2">
                    {enrollments.map((e) => {
                      const course = courses.find((c) => c.id === e.course_id)
                      return (
                        <li
                          key={e.id}
                          className="flex items-center justify-between border rounded-md px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{course?.title ?? e.course_id}</p>
                            <p className="text-xs text-muted-foreground">
                              Enrolled {formatDate(e.enrolled_at)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => unenroll.mutate(e.course_id)}
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

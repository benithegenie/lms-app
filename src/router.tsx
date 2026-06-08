import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Layouts
import { AdminLayout } from '@/components/layout/AdminLayout'
import { StudentLayout } from '@/components/layout/StudentLayout'
import { ManagerLayout } from '@/components/layout/ManagerLayout'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Lazy-loaded: these pull in the heavy Tiptap editor bundle, so they load on demand.
const EditorTest = lazy(() => import('@/pages/EditorTest').then((m) => ({ default: m.EditorTest })))
const CourseEditorPage = lazy(() =>
  import('@/pages/admin/CourseEditorPage').then((m) => ({ default: m.CourseEditorPage })),
)

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { CoursesPage } from '@/pages/admin/CoursesPage'
import { StudentsPage } from '@/pages/admin/StudentsPage'
import { GroupsPage } from '@/pages/admin/GroupsPage'
import { CompliancePage } from '@/pages/admin/CompliancePage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { LearningPathsPage } from '@/pages/admin/LearningPathsPage'

// Student pages
import { MyCoursesPage } from '@/pages/student/MyCoursesPage'
import { CourseViewPage } from '@/pages/student/CourseViewPage'
import { LessonViewPage } from '@/pages/student/LessonViewPage'
import { GradesPage } from '@/pages/student/GradesPage'
import { SearchPage } from '@/pages/student/SearchPage'
import { CertificatePage } from '@/pages/student/CertificatePage'
import { PathsPage } from '@/pages/student/PathsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RequireManager({ children }: { children: React.ReactNode }) {
  const { isManager, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (!isManager) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user, isAdmin, isManager, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : isManager ? '/manager' : '/dashboard'} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading…</div>}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/editor-test" element={<EditorTest />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:courseId" element={<CourseEditorPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="paths" element={<LearningPathsPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>

        {/* Manager routes (team-scoped compliance; data limited by RLS) */}
        <Route
          path="/manager"
          element={
            <RequireAuth>
              <RequireManager>
                <ManagerLayout />
              </RequireManager>
            </RequireAuth>
          }
        >
          <Route index element={<CompliancePage />} />
        </Route>

        {/* Student routes */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <StudentLayout />
            </RequireAuth>
          }
        >
          <Route index element={<MyCoursesPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="paths" element={<PathsPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="course/:courseId" element={<CourseViewPage />} />
          <Route path="course/:courseId/lesson/:lessonId" element={<LessonViewPage />} />
          <Route path="certificate/:courseId" element={<CertificatePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle, GraduationCap, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function StatCard({ title, value, icon: Icon, description }: {
  title: string
  value: number | string
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export function AdminDashboard() {
  const { data: courses } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('id, published')
      return data ?? []
    },
  })

  const { data: students } = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'student')
      return count ?? 0
    },
  })

  const { data: completions } = useQuery({
    queryKey: ['admin', 'completions'],
    queryFn: async () => {
      const { count } = await supabase
        .from('lesson_completions')
        .select('id', { count: 'exact', head: true })
      return count ?? 0
    },
  })

  const { data: enrollments } = useQuery({
    queryKey: ['admin', 'enrollments'],
    queryFn: async () => {
      const { count } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
      return count ?? 0
    },
  })

  const publishedCount = courses?.filter((c) => c.published).length ?? 0

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Overview of your LMS platform</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Courses"
          value={courses?.length ?? 0}
          icon={BookOpen}
          description={`${publishedCount} published`}
        />
        <StatCard
          title="Students"
          value={students ?? 0}
          icon={Users}
        />
        <StatCard
          title="Enrollments"
          value={enrollments ?? 0}
          icon={GraduationCap}
        />
        <StatCard
          title="Lessons Completed"
          value={completions ?? 0}
          icon={CheckCircle}
        />
      </div>
    </div>
  )
}

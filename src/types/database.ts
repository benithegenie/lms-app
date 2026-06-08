export type UserRole = 'admin' | 'student' | 'manager'
export type LessonType = 'article' | 'quiz'

// Shape each table must expose for the Supabase client's type machinery
// (postgrest-js GenericTable). Insert/Update are Partial so the existing
// insert/upsert calls — which rely on DB defaults — type-check; Row stays
// exact, so query *results* are still fully typed (where regressions matter).
type TableConfig<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableConfig<Profile>
      courses: TableConfig<Course>
      modules: TableConfig<Module>
      lessons: TableConfig<Lesson>
      article_content: TableConfig<ArticleContent>
      attachments: TableConfig<Attachment>
      quizzes: TableConfig<Quiz>
      questions: TableConfig<Question>
      question_options: TableConfig<QuestionOption>
      enrollments: TableConfig<Enrollment>
      lesson_completions: TableConfig<LessonCompletion>
      quiz_attempts: TableConfig<QuizAttempt>
      quiz_answers: TableConfig<QuizAnswer>
      groups: TableConfig<Group>
      group_members: TableConfig<GroupMember>
      course_required_groups: TableConfig<CourseRequiredGroup>
      notifications: TableConfig<Notification>
      article_content_versions: TableConfig<ArticleContentVersion>
      acknowledgements: TableConfig<Acknowledgement>
      audit_log: TableConfig<AuditLog>
      group_managers: TableConfig<GroupManager>
      learning_paths: TableConfig<LearningPath>
      learning_path_courses: TableConfig<LearningPathCourse>
    }
    Views: Record<string, never>
    Functions: {
      get_course_progress: {
        Args: { p_student_id: string; p_course_id: string }
        Returns: { completed: number; total: number }
      }
    }
    Enums: {
      user_role: UserRole
      lesson_type: LessonType
      notification_type: NotificationType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export type Course = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  published: boolean
  created_by: string
  created_at: string
  is_mandatory: boolean
  due_in_days: number | null
  recert_interval_days: number | null
}

export type Module = {
  id: string
  course_id: string
  title: string
  position: number
  created_at: string
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  type: LessonType
  position: number
  created_at: string
}

export type ArticleContent = {
  id: string
  lesson_id: string
  content: object | null
}

export type Attachment = {
  id: string
  lesson_id: string
  name: string
  file_url: string
  file_size: number
  created_at: string
}

export type Quiz = {
  id: string
  lesson_id: string
  pass_score: number
}

export type Question = {
  id: string
  quiz_id: string
  text: string
  position: number
}

export type QuestionOption = {
  id: string
  question_id: string
  text: string
  is_correct: boolean
}

export type Enrollment = {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
}

export type LessonCompletion = {
  id: string
  student_id: string
  lesson_id: string
  completed_at: string
}

export type QuizAttempt = {
  id: string
  student_id: string
  quiz_id: string
  score: number
  max_score: number
  submitted_at: string
}

export type QuizAnswer = {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id: string
}

export type NotificationType = 'mandatory_assigned' | 'reminder' | 'overdue'

export type Group = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type GroupMember = {
  id: string
  group_id: string
  profile_id: string
  created_at: string
}

export type GroupManager = {
  id: string
  group_id: string
  profile_id: string
  created_at: string
}

export type LearningPath = {
  id: string
  title: string
  description: string | null
  created_at: string
}

export type LearningPathCourse = {
  id: string
  path_id: string
  course_id: string
  position: number
}

export type CourseRequiredGroup = {
  id: string
  course_id: string
  group_id: string
}

export type Notification = {
  id: string
  profile_id: string
  course_id: string
  type: NotificationType
  due_at: string | null
  created_at: string
  dismissed_at: string | null
}

export type ArticleContentVersion = {
  id: string
  lesson_id: string
  content: object | null
  created_by: string | null
  created_at: string
}

export type Acknowledgement = {
  id: string
  student_id: string
  lesson_id: string
  acknowledged_at: string
}

export type AuditEvent = 'lesson_completed' | 'quiz_submitted' | 'acknowledged' | 'enrolled'

export type AuditLog = {
  id: string
  profile_id: string | null
  actor_id: string | null
  event: AuditEvent
  course_id: string | null
  lesson_id: string | null
  detail: object | null
  created_at: string
}

// Enriched types used in the UI
export interface CourseWithModules extends Course {
  modules: (Module & { lessons: Lesson[] })[]
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[]
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[]
}

export interface LessonWithContent extends Lesson {
  article_content: ArticleContent | null
  attachments: Attachment[]
  quiz: QuizWithQuestions | null
}

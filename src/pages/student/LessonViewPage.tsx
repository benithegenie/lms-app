import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle, Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchCourseWithModules, fetchArticleContent } from '@/lib/api/courses'
import { fetchAttachments } from '@/lib/api/attachments'
import { fetchQuizWithQuestions, fetchStudentQuizAttempt, submitQuizAttempt } from '@/lib/api/quizzes'
import { markLessonComplete, fetchAllCompletions } from '@/lib/api/students'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatBytes, formatDate } from '@/lib/utils'
import { QuizPlayer } from './QuizPlayer'
import { fetchArticleVersions } from '@/lib/api/versions'
import { tiptapToPlainText } from '@/lib/tiptap'
import { ArticleDiff } from '@/components/ArticleDiff'
import { acknowledgeLesson, fetchAcknowledgement } from '@/lib/api/acknowledgements'
import { toast } from 'sonner'
import { recertStatus } from '@/lib/compliance-utils'

export function LessonViewPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: course } = useQuery({
    queryKey: ['student', 'course', courseId],
    queryFn: () => fetchCourseWithModules(courseId!),
    enabled: !!courseId,
  })

  const { data: articleContent } = useQuery({
    queryKey: ['lesson-content', lessonId],
    queryFn: () => fetchArticleContent(lessonId!),
    enabled: !!lessonId,
  })

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', lessonId],
    queryFn: () => fetchAttachments(lessonId!),
    enabled: !!lessonId,
  })

  const { data: quiz } = useQuery({
    queryKey: ['quiz', lessonId],
    queryFn: () => fetchQuizWithQuestions(lessonId!),
    enabled: !!lessonId,
  })

  const { data: attempt, isLoading: attemptLoading } = useQuery({
    queryKey: ['quiz-attempt', user?.id, quiz?.id],
    queryFn: () => fetchStudentQuizAttempt(user!.id, quiz!.id),
    enabled: !!user && !!quiz?.id,
  })

  const { data: acknowledgement } = useQuery({
    queryKey: ['acknowledgement', user?.id, lessonId],
    queryFn: () => fetchAcknowledgement(user!.id, lessonId!),
    enabled: !!user && !!lessonId,
  })

  // For articles, "I have read and understood" both completes the lesson and
  // records an attestation (which the DB audit log captures).
  const acknowledge = useMutation({
    mutationFn: async () => {
      await acknowledgeLesson(user!.id, lessonId!)
      await markLessonComplete(user!.id, lessonId!)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['acknowledgement', user?.id, lessonId] })
      qc.invalidateQueries({ queryKey: ['student', 'completions', user?.id] })
      qc.invalidateQueries({ queryKey: ['mandatory-pending', user?.id] })
      toast.success('Acknowledged — thank you')
    },
  })

  const submitQuiz = useMutation({
    mutationFn: (answers: { questionId: string; selectedOptionId: string }[]) =>
      submitQuizAttempt(user!.id, quiz!.id, answers, quiz!.questions),
    onSuccess: async (attempt) => {
      // Only count the lesson complete when the student actually passes.
      const pct = attempt.max_score > 0 ? (attempt.score / attempt.max_score) * 100 : 0
      if (pct >= quiz!.pass_score) {
        await markLessonComplete(user!.id, lessonId!)
      }
      qc.invalidateQueries({ queryKey: ['quiz-attempt', user?.id, quiz?.id] })
      qc.invalidateQueries({ queryKey: ['student', 'completions', user?.id] })
      qc.invalidateQueries({ queryKey: ['mandatory-pending', user?.id] })
    },
  })

  const [showDiff, setShowDiff] = useState(false)
  const { data: versions = [] } = useQuery({
    queryKey: ['article-versions', lessonId],
    queryFn: () => fetchArticleVersions(lessonId!),
    enabled: !!lessonId,
  })

  const { data: myCompletions = [] } = useQuery({
    queryKey: ['student', 'completions', user?.id],
    queryFn: () => fetchAllCompletions(user!.id),
    enabled: !!user,
  })

  const allLessons = course?.modules.flatMap((m) => m.lessons) ?? []
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null
  const currentLesson = allLessons[currentIndex]

  function renderArticleContent(content: object | null): string {
    if (!content) return '<p class="text-muted-foreground italic">No content yet.</p>'
    const json = content as { type: string; content?: object[] }
    const escapeHtml = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
      )
    function nodeToHtml(node: { type: string; content?: object[]; text?: string; marks?: { type: string }[]; attrs?: Record<string, string | number> }): string {
      if (node.type === 'text') {
        let t = escapeHtml(node.text ?? '')
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') t = `<strong>${t}</strong>`
            if (mark.type === 'italic') t = `<em>${t}</em>`
            if (mark.type === 'underline') t = `<u>${t}</u>`
            if (mark.type === 'code') t = `<code>${t}</code>`
          }
        }
        return t
      }
      const children = (node.content ?? []).map((c) => nodeToHtml(c as Parameters<typeof nodeToHtml>[0])).join('')
      switch (node.type) {
        case 'paragraph': return `<p>${children}</p>`
        case 'heading': {
          const lvl = Math.min(6, Math.max(1, Number(node.attrs?.level) || 2))
          return `<h${lvl}>${children}</h${lvl}>`
        }
        case 'bulletList': return `<ul>${children}</ul>`
        case 'orderedList': return `<ol>${children}</ol>`
        case 'listItem': return `<li>${children}</li>`
        case 'blockquote': return `<blockquote>${children}</blockquote>`
        case 'codeBlock': return `<pre><code>${children}</code></pre>`
        case 'hardBreak': return '<br>'
        case 'horizontalRule': return '<hr>'
        case 'callout': {
          const v = node.attrs?.variant
          const variant = v === 'warn' || v === 'success' ? v : 'info'
          return `<div class="callout" data-variant="${variant}">${children}</div>`
        }
        case 'table': return `<div class="tableWrapper"><table><tbody>${children}</tbody></table></div>`
        case 'tableRow': return `<tr>${children}</tr>`
        case 'tableHeader': return `<th>${children}</th>`
        case 'tableCell': return `<td>${children}</td>`
        case 'image': {
          const src = String(node.attrs?.src ?? '')
          if (!src || /^\s*javascript:/i.test(src)) return ''
          return `<img src="${escapeHtml(src)}" alt="${escapeHtml(String(node.attrs?.alt ?? ''))}" />`
        }
        default: return children
      }
    }
    return nodeToHtml(json as Parameters<typeof nodeToHtml>[0])
  }

  if (!course || !currentLesson) {
    return <div className="p-8 text-muted-foreground">Loading…</div>
  }

  // Recertification window for this course (mandatory + recert interval set).
  // recertDue = within 30 days of expiry, or already expired.
  const courseLessonIdList = course.modules.flatMap((m) => m.lessons).map((l) => l.id)
  const courseCompletionTimes = myCompletions
    .filter((c) => courseLessonIdList.includes(c.lesson_id))
    .map((c) => new Date(c.completed_at).getTime())
  const allCourseComplete =
    courseLessonIdList.length > 0 && courseCompletionTimes.length >= courseLessonIdList.length
  const recertInterval = course.is_mandatory ? course.recert_interval_days : null
  let recertDue = false
  if (allCourseComplete && recertInterval != null) {
    recertDue = recertStatus(Math.max(...courseCompletionTimes), recertInterval).dueSoon
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        to={`/dashboard/course/${courseId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3 w-3" /> Back to course
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold flex-1">{currentLesson.title}</h1>
        <Badge variant="outline">{currentLesson.type}</Badge>
      </div>

      {currentLesson.type === 'article' && (
        <div
          className="lesson-content prose max-w-none"
          dangerouslySetInnerHTML={{ __html: renderArticleContent(articleContent?.content ?? null) }}
        />
      )}

      {currentLesson.type === 'article' && versions.length > 0 && (
        <div className="mt-6 text-sm border-t pt-4">
          <p className="text-muted-foreground">
            Last updated {formatDate(versions[0].created_at)}
            {versions[0].author ? ` by ${versions[0].author}` : ''}
          </p>
          {versions.length > 1 && (
            <div className="mt-1">
              <button
                onClick={() => setShowDiff((v) => !v)}
                className="text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                aria-expanded={showDiff}
              >
                {showDiff ? 'Hide changes' : 'See what changed since the previous version'}
              </button>
              {showDiff && (
                <div className="mt-3 border rounded-md p-4 bg-muted/30">
                  <ArticleDiff
                    oldText={tiptapToPlainText(versions[1].content)}
                    newText={tiptapToPlainText(versions[0].content)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentLesson.type === 'quiz' && !attemptLoading && (
        quiz
          ? <QuizPlayer
              quiz={quiz}
              existingAttempt={attempt ?? null}
              recertDue={recertDue}
              onSubmit={(answers) => submitQuiz.mutateAsync(answers)}
            />
          : <p className="text-muted-foreground">Quiz not configured yet.</p>
      )}

      {attachments.length > 0 && (
        <div className="mt-8">
          <Separator className="mb-6" />
          <h3 className="font-semibold mb-3">Attachments</h3>
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={a.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 border rounded-md px-3 py-2 hover:bg-muted text-sm"
                >
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{a.name}</span>
                  <span className="text-muted-foreground text-xs">{formatBytes(a.file_size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {currentLesson.type === 'article' && (
        <div className="mt-8">
          {acknowledgement ? (
            <p className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              You acknowledged this on {formatDate(acknowledgement.acknowledged_at)}
            </p>
          ) : (
            <Button
              onClick={() => acknowledge.mutate()}
              disabled={acknowledge.isPending}
              className="w-full"
            >
              <CheckCircle className="h-4 w-4" />
              {acknowledge.isPending ? 'Saving…' : 'I have read and understood'}
            </Button>
          )}
        </div>
      )}

      <Separator className="my-8" />

      <div className="flex justify-between">
        {prevLesson ? (
          <Button variant="outline" onClick={() => navigate(`/dashboard/course/${courseId}/lesson/${prevLesson.id}`)}>
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>
        ) : <div />}
        {nextLesson ? (
          <Button onClick={() => navigate(`/dashboard/course/${courseId}/lesson/${nextLesson.id}`)}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate(`/dashboard/course/${courseId}`)}>
            Finish course
          </Button>
        )}
      </div>
    </div>
  )
}

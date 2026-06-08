import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizWithQuestions, QuizAttempt } from '@/types/database'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  quiz: QuizWithQuestions
  existingAttempt: QuizAttempt | null
  recertDue?: boolean
  onSubmit: (answers: { questionId: string; selectedOptionId: string }[]) => Promise<QuizAttempt>
}

export function QuizPlayer({ quiz, existingAttempt, onSubmit, recertDue }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizAttempt | null>(existingAttempt)
  const [submitting, setSubmitting] = useState(false)

  function handleRetake() {
    setSelected({})
    setResult(null)
  }

  if (result) {
    const pct = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0
    const passed = pct >= quiz.pass_score
    return (
      <div className="space-y-6">
        <div className={cn(
          'rounded-lg border p-6 text-center',
          passed ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50',
        )}>
          {passed
            ? <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            : <XCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
          }
          <p className="text-2xl font-bold">{result.score}/{result.max_score}</p>
          <p className="text-muted-foreground mt-1">{pct}% — {passed ? 'Passed!' : 'Not passed'}</p>
          <p className="text-sm text-muted-foreground mt-1">Pass score: {quiz.pass_score}%</p>
          {!passed && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                You need {quiz.pass_score}% to complete this lesson. Review the material and try again.
              </p>
              <Button onClick={handleRetake}>Retake quiz</Button>
            </div>
          )}
          {passed && recertDue && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Your certification is expiring — retake the quiz to recertify.
              </p>
              <Button onClick={handleRetake}>Recertify (retake quiz)</Button>
            </div>
          )}
        </div>

        {/* Answer review only after passing — so a retake stays meaningful */}
        {passed && (
          <div className="space-y-4">
            {quiz.questions.map((q, i) => (
              <div key={q.id} className="border rounded-lg p-4">
                <p className="font-medium mb-3">Q{i + 1}. {q.text}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
                        opt.is_correct
                          ? 'bg-green-50 border border-green-300 text-green-800'
                          : 'border text-muted-foreground',
                      )}
                    >
                      {opt.is_correct
                        ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        : <div className="h-4 w-4 rounded-full border shrink-0" />
                      }
                      {opt.text}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  async function handleSubmit() {
    const answers = Object.entries(selected).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }))
    if (answers.length < quiz.questions.length) return
    setSubmitting(true)
    const attempt = await onSubmit(answers)
    setResult(attempt)
    setSubmitting(false)
  }

  const allAnswered = quiz.questions.every((q) => !!selected[q.id])

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {quiz.questions.length} questions · Pass score: {quiz.pass_score}%
      </p>

      {quiz.questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4">
          <p className="font-medium mb-3">Q{i + 1}. {q.text}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelected((s) => ({ ...s, [q.id]: opt.id }))}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-3 py-2 rounded-md border text-sm transition-colors',
                  selected[q.id] === opt.id
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'hover:bg-muted',
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full border-2 shrink-0',
                  selected[q.id] === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground',
                )} />
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full"
      >
        {submitting ? 'Submitting…' : 'Submit quiz'}
      </Button>
    </div>
  )
}

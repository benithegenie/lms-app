import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Check } from 'lucide-react'
import type { QuizWithQuestions } from '@/types/database'
import {
  upsertQuiz, createQuestion, deleteQuestion,
  createOption, updateOption, deleteOption,
} from '@/lib/api/quizzes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  lessonId: string
  quiz: QuizWithQuestions | null
}

export function QuizBuilder({ lessonId, quiz }: Props) {
  const qc = useQueryClient()
  const [passScore, setPassScore] = useState(quiz?.pass_score ?? 70)
  const [newQuestionText, setNewQuestionText] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['quiz', lessonId] })

  const initQuiz = useMutation({
    mutationFn: () => upsertQuiz(lessonId, passScore),
    onSuccess: invalidate,
  })

  const addQuestion = useMutation({
    mutationFn: async () => {
      let quizId = quiz?.id
      if (!quizId) {
        const q = await upsertQuiz(lessonId, passScore)
        quizId = q.id
      }
      return createQuestion({
        quiz_id: quizId,
        text: newQuestionText,
        position: (quiz?.questions.length ?? 0) + 1,
      })
    },
    onSuccess: () => { invalidate(); setNewQuestionText('') },
  })

  const removeQuestion = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: invalidate,
  })

  const addOption = useMutation({
    mutationFn: ({ questionId, text }: { questionId: string; text: string }) =>
      createOption({ question_id: questionId, text, is_correct: false }),
    onSuccess: invalidate,
  })

  const setCorrect = useMutation({
    mutationFn: async ({ questionId, optionId }: { questionId: string; optionId: string }) => {
      const q = quiz?.questions.find((q) => q.id === questionId)
      if (!q) return
      await Promise.all(
        q.options.map((o) => updateOption(o.id, { is_correct: o.id === optionId }))
      )
    },
    onSuccess: invalidate,
  })

  const removeOption = useMutation({
    mutationFn: deleteOption,
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label>Pass score (%)</Label>
        <Input
          type="number"
          className="w-24"
          min={0}
          max={100}
          value={passScore}
          onChange={(e) => setPassScore(Number(e.target.value))}
          onBlur={() => quiz && upsertQuiz(lessonId, passScore)}
        />
        {!quiz && (
          <Button variant="outline" size="sm" onClick={() => initQuiz.mutate()}>
            Initialize quiz
          </Button>
        )}
      </div>

      {quiz?.questions.map((question, qi) => (
        <div key={question.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm text-muted-foreground">Q{qi + 1}</span>
            <p className="flex-1 font-medium">{question.text}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeQuestion.mutate(question.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>

          <div className="space-y-2 pl-5">
            {question.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-2">
                <button
                  onClick={() => setCorrect.mutate({ questionId: question.id, optionId: opt.id })}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    opt.is_correct
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-muted-foreground hover:border-primary'
                  }`}
                  title="Mark as correct"
                >
                  {opt.is_correct && <Check className="h-3 w-3" />}
                </button>
                <span className="text-sm flex-1">{opt.text}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeOption.mutate(opt.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <AddOptionInline
              onAdd={(text) => addOption.mutate({ questionId: question.id, text })}
            />
          </div>
        </div>
      ))}

      <form
        onSubmit={(e) => { e.preventDefault(); if (newQuestionText.trim()) addQuestion.mutate() }}
        className="flex gap-2"
      >
        <Input
          placeholder="Add a new question…"
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
        />
        <Button type="submit" variant="outline">
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </form>
    </div>
  )
}

function AddOptionInline({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        <Plus className="h-3 w-3" /> Add option
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) { onAdd(text.trim()); setText('') }
        setActive(false)
      }}
      className="flex gap-2"
    >
      <Input
        placeholder="Option text…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        className="h-7 text-sm"
      />
      <Button type="submit" size="sm" className="h-7">Add</Button>
      <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setActive(false)}>Cancel</Button>
    </form>
  )
}

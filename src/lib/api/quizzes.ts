import { supabase } from '@/lib/supabase'
import type { Quiz, Question, QuestionOption, QuizWithQuestions, QuizAttempt } from '@/types/database'

export async function fetchQuizWithQuestions(lessonId: string): Promise<QuizWithQuestions | null> {
  const { data } = await supabase
    .from('quizzes')
    .select('*, questions(*, options:question_options(*))')
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (!data) return null
  const quiz = data as unknown as QuizWithQuestions
  quiz.questions.sort((a, b) => a.position - b.position)
  return quiz
}

export async function upsertQuiz(lessonId: string, passScore: number): Promise<Quiz> {
  const { data, error } = await supabase
    .from('quizzes')
    .upsert({ lesson_id: lessonId, pass_score: passScore }, { onConflict: 'lesson_id' })
    .select()
    .single()
  if (error) throw error
  return data as Quiz
}

export async function createQuestion(data: {
  quiz_id: string
  text: string
  position: number
}): Promise<Question> {
  const { data: q, error } = await supabase.from('questions').insert(data).select().single()
  if (error) throw error
  return q as Question
}

export async function updateQuestion(id: string, data: Partial<Question>) {
  const { error } = await supabase.from('questions').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

export async function createOption(data: {
  question_id: string
  text: string
  is_correct: boolean
}): Promise<QuestionOption> {
  const { data: opt, error } = await supabase.from('question_options').insert(data).select().single()
  if (error) throw error
  return opt as QuestionOption
}

export async function updateOption(id: string, data: Partial<QuestionOption>) {
  const { error } = await supabase.from('question_options').update(data).eq('id', id)
  if (error) throw error
}

export async function deleteOption(id: string) {
  const { error } = await supabase.from('question_options').delete().eq('id', id)
  if (error) throw error
}

export async function fetchStudentQuizAttempt(
  studentId: string,
  quizId: string,
): Promise<QuizAttempt | null> {
  // latest attempt (retakes mean there can be more than one)
  const { data } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('student_id', studentId)
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as QuizAttempt | null
}

export async function submitQuizAttempt(
  studentId: string,
  quizId: string,
  answers: { questionId: string; selectedOptionId: string }[],
  questions: { id: string; options: { id: string; is_correct: boolean }[] }[],
): Promise<QuizAttempt> {
  const maxScore = questions.length
  const score = answers.reduce((acc, ans) => {
    const q = questions.find((q) => q.id === ans.questionId)
    const opt = q?.options.find((o) => o.id === ans.selectedOptionId)
    return acc + (opt?.is_correct ? 1 : 0)
  }, 0)

  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({ student_id: studentId, quiz_id: quizId, score, max_score: maxScore })
    .select()
    .single()
  if (error) throw error

  const answerRows = answers.map((a) => ({
    attempt_id: attempt.id,
    question_id: a.questionId,
    selected_option_id: a.selectedOptionId,
  }))
  await supabase.from('quiz_answers').insert(answerRows)

  return attempt as QuizAttempt
}

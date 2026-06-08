import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import { editorExtensions } from '@/components/editor/extensions'
import {
  Bold, Italic, UnderlineIcon, List, ListOrdered, Quote,
  Code, Heading1, Heading2, Save, Upload, Trash2,
  Image as ImageIcon, Table as TableIcon, History,
} from 'lucide-react'
import type { Lesson } from '@/types/database'
import { fetchArticleContent, upsertArticleContent, saveArticleDraft, updateLesson } from '@/lib/api/courses'
import { fetchAttachments, uploadAttachment, deleteAttachment } from '@/lib/api/attachments'
import { fetchQuizWithQuestions } from '@/lib/api/quizzes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatBytes } from '@/lib/utils'
import { QuizBuilder } from './QuizBuilder'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { VersionHistory } from '@/components/VersionHistory'

interface Props {
  lesson: Lesson
  onTitleSave: () => void
}

export function LessonEditor({ lesson, onTitleSave }: Props) {
  const qc = useQueryClient()
  const [title, setTitle] = useState(lesson.title)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: content } = useQuery({
    queryKey: ['lesson-content', lesson.id],
    queryFn: () => fetchArticleContent(lesson.id),
    enabled: lesson.type === 'article',
  })

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', lesson.id],
    queryFn: () => fetchAttachments(lesson.id),
  })

  const { data: quiz } = useQuery({
    queryKey: ['quiz', lesson.id],
    queryFn: () => fetchQuizWithQuestions(lesson.id),
    enabled: lesson.type === 'quiz',
  })

  async function uploadImageFiles(files: FileList) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      try {
        const att = await uploadAttachment(lesson.id, file)
        editor?.chain().focus().setImage({ src: att.file_url, alt: att.name }).run()
        qc.invalidateQueries({ queryKey: ['attachments', lesson.id] })
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Image upload failed')
      }
    }
  }

  const editor = useEditor({
    extensions: editorExtensions(),
    content: (content?.content as object) ?? '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'data-placeholder': 'Type / for blocks, or just start writing…',
      },
      handlePaste: (_view, event) => {
        const files = event.clipboardData?.files
        if (files && Array.from(files).some((f) => f.type.startsWith('image/'))) {
          void uploadImageFiles(files)
          return true
        }
        return false
      },
      handleDrop: (_view, event) => {
        const files = (event as DragEvent).dataTransfer?.files
        if (files && Array.from(files).some((f) => f.type.startsWith('image/'))) {
          event.preventDefault()
          void uploadImageFiles(files)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Debounced autosave — draft only, no version snapshot.
      setSaveStatus('saving')
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      const json = editor.getJSON()
      autosaveTimer.current = setTimeout(() => {
        saveArticleDraft(lesson.id, json)
          .then(() => setSaveStatus('saved'))
          .catch(() => setSaveStatus('idle'))
      }, 1200)
    },
    onBlur: ({ editor }) => {
      // Snapshot a version when the author leaves the editor (skipped if unchanged).
      void upsertArticleContent(lesson.id, editor.getJSON())
    },
  }, [content?.content])

  // Manual save: flush autosave + snapshot a version now.
  const saveContent = useCallback(async () => {
    if (!editor) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setSaveStatus('saving')
    await upsertArticleContent(lesson.id, editor.getJSON())
    setSaveStatus('saved')
    toast.success('Saved')
  }, [editor, lesson.id])

  const saveTitle = useMutation({
    mutationFn: () => updateLesson(lesson.id, { title }),
    onSuccess: onTitleSave,
  })

  const uploadFile = useMutation({
    mutationFn: (file: File) => uploadAttachment(lesson.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', lesson.id] }),
  })

  const removeAttachment = useMutation({
    mutationFn: (a: typeof attachments[number]) => deleteAttachment(a),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', lesson.id] }),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile.mutate(file)
    e.target.value = ''
  }

  const insertImage = useMutation({
    mutationFn: (file: File) => uploadAttachment(lesson.id, file),
    onSuccess: (att) => {
      editor?.chain().focus().setImage({ src: att.file_url, alt: att.name }).run()
      qc.invalidateQueries({ queryKey: ['attachments', lesson.id] })
    },
  })

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) insertImage.mutate(file)
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Title */}
      <div className="flex items-center gap-2 mb-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
          onBlur={() => { if (title !== lesson.title) saveTitle.mutate() }}
        />
        <Badge variant="outline">{lesson.type}</Badge>
      </div>

      {lesson.type === 'article' && (
        <>
          {/* Toolbar */}
          <div
            className="flex flex-wrap items-center gap-1 p-2 border rounded-t-md bg-muted/30"
            role="toolbar"
            aria-label="Formatting"
          >
            {[
              { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), title: 'H1' },
              { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), title: 'H2' },
              { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), title: 'Bold' },
              { icon: Italic, action: () => editor?.chain().focus().toggleItalic().run(), title: 'Italic' },
              { icon: UnderlineIcon, action: () => editor?.chain().focus().toggleUnderline().run(), title: 'Underline' },
              { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), title: 'Bullet list' },
              { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), title: 'Ordered list' },
              { icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run(), title: 'Blockquote' },
              { icon: Code, action: () => editor?.chain().focus().toggleCode().run(), title: 'Code' },
              { icon: TableIcon, action: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), title: 'Table' },
            ].map(({ icon: Icon, action, title }) => (
              <Button
                key={title}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={action}
                title={title}
                aria-label={title}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ))}
            <label className="cursor-pointer" title="Insert image">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
                disabled={insertImage.isPending}
                aria-label="Insert image"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <span aria-hidden="true"><ImageIcon className="h-3.5 w-3.5" /></span>
              </Button>
            </label>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground self-center mr-1" aria-live="polite">
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : ''}
            </span>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" title="Version history">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Version history</DialogTitle>
                </DialogHeader>
                <VersionHistory lessonId={lesson.id} />
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={saveContent} disabled={saveStatus === 'saving'}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Save
            </Button>
          </div>

          {/* Editor */}
          <div className="border border-t-0 rounded-b-md min-h-[400px] cursor-text" onClick={() => editor?.commands.focus()}>
            <EditorContent editor={editor} className="lesson-content" />
          </div>
        </>
      )}

      {lesson.type === 'quiz' && (
        <QuizBuilder lessonId={lesson.id} quiz={quiz ?? null} />
      )}

      {/* Attachments */}
      <div className="mt-8">
        <Separator className="mb-6" />
        <div className="flex items-center justify-between mb-4">
          <Label className="text-base font-semibold">Attachments</Label>
          <label className="cursor-pointer">
            <input
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploadFile.isPending}
              aria-label="Upload file"
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4" aria-hidden="true" />
                {uploadFile.isPending ? 'Uploading…' : 'Upload file'}
              </span>
            </Button>
          </label>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(a.file_size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeAttachment.mutate(a)}
                  aria-label={`Delete attachment ${a.name}`}
                  title="Delete attachment"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

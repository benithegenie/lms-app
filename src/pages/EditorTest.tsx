// No-login demo of the slash-command editor. Reachable at /editor-test.
import { useEditor, EditorContent } from '@tiptap/react'
import { editorExtensions } from '@/components/editor/extensions'

export function EditorTest() {
  const editor = useEditor({
    extensions: editorExtensions(),
    content: '', // start empty so the very first "/" you type opens the menu
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Slash-command editor — live demo</h1>
      <p className="text-sm text-muted-foreground mb-6">
        No login needed. <strong>Click the empty box below and press the <code>/</code> key.</strong>{' '}
        A menu of blocks (headings, lists, callouts, divider…) should pop up instantly.
      </p>
      <div
        className="border-2 border-dashed rounded-md min-h-[360px] p-2 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} className="lesson-content" />
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Tip: in the real lesson editor, the same <code>/</code> menu works — but only at the
        start of an empty line. Press <kbd>Enter</kbd> for a new line first, then type <code>/</code>.
      </p>
    </div>
  )
}

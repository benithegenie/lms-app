// Extract readable plain text from Tiptap JSON, for diffing two versions.
// Block-level nodes get a trailing newline so the diff reads naturally.
const BLOCK_TYPES = new Set([
  'paragraph', 'heading', 'listItem', 'blockquote', 'codeBlock', 'tableRow', 'horizontalRule',
])

export function tiptapToPlainText(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  const node = json as { type?: string; text?: string; content?: unknown[] }
  if (node.type === 'text') return node.text ?? ''
  let text = (node.content ?? []).map(tiptapToPlainText).join('')
  if (node.type && BLOCK_TYPES.has(node.type)) text += '\n'
  return text
}

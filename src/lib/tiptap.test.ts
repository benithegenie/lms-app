import { describe, it, expect } from 'vitest'
import { tiptapToPlainText } from './tiptap'

describe('tiptapToPlainText', () => {
  it('returns empty for non-objects', () => {
    expect(tiptapToPlainText(null)).toBe('')
    expect(tiptapToPlainText('nope')).toBe('')
  })

  it('extracts text from headings and paragraphs', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }] },
      ],
    }
    const out = tiptapToPlainText(doc)
    expect(out).toContain('Title')
    expect(out).toContain('Hello world')
  })

  it('adds a newline after each block node', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      ],
    }
    expect(tiptapToPlainText(doc)).toBe('a\nb\n')
  })
})

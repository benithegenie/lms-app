import { diffWords } from 'diff'

// Renders a word-level diff: additions green, removals red strikethrough.
export function ArticleDiff({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = diffWords(oldText, newText)
  const unchanged = parts.every((p) => !p.added && !p.removed)

  if (unchanged) {
    return <p className="text-sm text-muted-foreground italic">No text changes in this version.</p>
  }

  return (
    <div className="text-sm whitespace-pre-wrap leading-7">
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.added
              ? 'bg-green-100 text-green-800 rounded-sm'
              : p.removed
                ? 'bg-red-100 text-red-700 line-through rounded-sm'
                : ''
          }
        >
          {p.value}
        </span>
      ))}
    </div>
  )
}

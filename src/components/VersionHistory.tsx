import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchArticleVersions } from '@/lib/api/versions'
import { tiptapToPlainText } from '@/lib/tiptap'
import { ArticleDiff } from '@/components/ArticleDiff'
import { formatDate } from '@/lib/utils'

export function VersionHistory({ lessonId }: { lessonId: string }) {
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['article-versions', lessonId],
    queryFn: () => fetchArticleVersions(lessonId),
  })
  const [idx, setIdx] = useState(0)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">No saved versions yet. Save the article to start its history.</p>
  }

  const current = versions[idx]
  const previous = versions[idx + 1] // next-older version
  const newText = tiptapToPlainText(current.content)
  const oldText = previous ? tiptapToPlainText(previous.content) : ''

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 max-h-[60vh]">
      <ul className="space-y-1 overflow-y-auto pr-2 border-r">
        {versions.map((v, i) => (
          <li key={v.id}>
            <button
              onClick={() => setIdx(i)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                i === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              <div className="font-medium">
                {formatDate(v.created_at)}{i === 0 ? ' · current' : ''}
              </div>
              <div className={`text-xs ${i === idx ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {v.author ?? 'Unknown'}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="overflow-y-auto">
        {previous ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">Changes vs the previous version:</p>
            <ArticleDiff oldText={oldText} newText={newText} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This is the first saved version.</p>
        )}
      </div>
    </div>
  )
}

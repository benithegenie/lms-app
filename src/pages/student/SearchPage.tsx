import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchLessons } from '@/lib/api/search'
import { Input } from '@/components/ui/input'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const ready = query.trim().length >= 2

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['search', query.trim()],
    queryFn: () => searchLessons(query),
    enabled: ready,
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search the knowledge base…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!ready ? (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for “{query.trim()}”.</p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.lessonId}>
              <Link
                to={`/dashboard/course/${r.courseId}/lesson/${r.lessonId}`}
                className="block border rounded-md p-4 hover:bg-muted transition-colors"
              >
                <p className="text-xs text-muted-foreground">{r.courseTitle}</p>
                <p className="font-medium">{r.lessonTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{r.snippet}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

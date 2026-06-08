import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    if (localStorage.theme === 'dark') return 'dark'
  } catch {
    /* ignore */
  }
  return 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.theme = theme
    } catch {
      /* ignore */
    }
  }, [theme])

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-3"
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </Button>
  )
}

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'

export type SlashCommandItem = {
  title: string
  description: string
  command: (props: { editor: Editor; range: Range }) => void
}

type Props = {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

export type SlashCommandListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const SlashCommandList = forwardRef<SlashCommandListRef, Props>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => setSelectedIndex(0), [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command(item)
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-popover border border-border rounded-md shadow-md p-2 text-sm text-muted-foreground w-64">
          No matches
        </div>
      )
    }

    return (
      <div className="bg-popover border border-border rounded-md shadow-md p-1 max-h-72 overflow-y-auto w-64">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              selectItem(index)
            }}
            className={`w-full text-left px-2 py-1.5 rounded text-sm flex flex-col ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            }`}
          >
            <span className="font-medium">{item.title}</span>
            <span className="text-xs text-muted-foreground">{item.description}</span>
          </button>
        ))}
      </div>
    )
  },
)
SlashCommandList.displayName = 'SlashCommandList'

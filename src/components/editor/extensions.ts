import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Image from '@tiptap/extension-image'
import { Callout } from './Callout'
import { SlashCommand } from './SlashCommand'

// Single source of truth for the editor's extensions, shared by the admin
// LessonEditor and the /editor-test demo so the two can never drift apart
// (that drift is what made earlier debugging confusing).
export function editorExtensions() {
  return [
    StarterKit,
    Underline,
    Link.configure({ openOnClick: false }),
    Callout,
    SlashCommand,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Image.configure({ inline: false }),
  ]
}

import { useEffect, useRef } from 'react'

/**
 * Wires up keyboard + focus behavior for the mobile sidebar drawer:
 *  - Escape key closes the drawer
 *  - Focus returns to the trigger (the menu button) after close
 *  - Drawer gets focus when it opens (so screen readers announce it)
 *
 * Returns a ref to attach to the drawer's root and the trigger button.
 */
export function useMobileDrawer(open: boolean, onClose: () => void) {
  const drawerRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Focus the drawer for screen reader announcement
    drawerRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      // Restore focus to the trigger when the drawer closes
      triggerRef.current?.focus()
    }
  }, [open, onClose])

  return { drawerRef, triggerRef }
}

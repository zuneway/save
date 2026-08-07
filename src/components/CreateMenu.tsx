import { useEffect, useId, useRef } from 'react'

interface CreateMenuProps {
  open: boolean
  onClose: () => void
  onCreateFolder: () => void
  onCreateProject: () => void
  /** Defaults to savings-project wording. */
  variant?: 'savings' | 'periodic'
}

export function CreateMenu({
  open,
  onClose,
  onCreateFolder,
  onCreateProject,
  variant = 'savings',
}: CreateMenuProps) {
  const isPeriodic = variant === 'periodic'
  const menuId = useId()
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) firstItemRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button type="button" className="menu-scrim" aria-label="關閉選單" onClick={onClose} />
      <div className="island-menu island-menu-right" role="menu" id={menuId} aria-label="建立選單">
        <button
          ref={firstItemRef}
          type="button"
          className="create-menu-item"
          role="menuitem"
          onClick={() => {
            onClose()
            onCreateProject()
          }}
        >
          <span className="create-menu-icon" aria-hidden="true">
            {isPeriodic ? '📅' : '💰'}
          </span>
          <span>
            <strong>{isPeriodic ? '建立計畫' : '建立專案'}</strong>
            <small>{isPeriodic ? '新增一筆定期儲蓄' : '新增一個存錢目標'}</small>
          </span>
        </button>
        <button
          type="button"
          className="create-menu-item"
          role="menuitem"
          onClick={() => {
            onClose()
            onCreateFolder()
          }}
        >
          <span className="create-menu-icon" aria-hidden="true">
            📁
          </span>
          <span>
            <strong>建立資料夾</strong>
            <small>{isPeriodic ? '用來整理多個定期計畫' : '用來整理多個存錢專案'}</small>
          </span>
        </button>
      </div>
    </>
  )
}

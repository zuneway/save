import { useEffect, useId, useRef } from 'react'
import type { ProjectFolder, SelectionMode } from '../types/savings'

interface SelectionMenuProps {
  open: boolean
  folders: ProjectFolder[]
  selectionMode: SelectionMode
  selectedCount: number
  canRemoveFromFolder: boolean
  /** Folder IDs that every selected project already belongs to — hide from "加入資料夾". */
  currentFolderIds: string[]
  onClose: () => void
  onToggleSelectionMode: () => void
  onMoveToFolder: (folderId: string | null) => void
  onDelete: () => void
}

export function SelectionMenu({
  open,
  folders,
  selectionMode,
  selectedCount,
  canRemoveFromFolder,
  currentFolderIds,
  onClose,
  onToggleSelectionMode,
  onMoveToFolder,
  onDelete,
}: SelectionMenuProps) {
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

  const currentFolderIdSet = new Set(currentFolderIds)
  const joinableFolders = folders.filter((folder) => !currentFolderIdSet.has(folder.id))

  return (
    <>
      <button type="button" className="menu-scrim" aria-label="關閉選單" onClick={onClose} />
      <div className="island-menu island-menu-left" role="menu" id={menuId} aria-label="專案操作">
        <p className="island-menu-caption">已選 {selectedCount} 個專案</p>

        <button
          ref={firstItemRef}
          type="button"
          className="create-menu-item"
          role="menuitem"
          onClick={() => {
            onToggleSelectionMode()
            onClose()
          }}
        >
          <span className="create-menu-icon" aria-hidden="true">
            {selectionMode === 'single' ? '◎' : '☑'}
          </span>
          <span>
            <strong>切換為{selectionMode === 'single' ? '多選' : '單選'}</strong>
            <small>目前是{selectionMode === 'single' ? '單選' : '多選'}模式</small>
          </span>
        </button>

        <div className="island-menu-divider" />

        <p className="island-menu-caption">加入資料夾</p>
        {folders.length === 0 ? (
          <p className="island-menu-empty">尚未建立資料夾</p>
        ) : joinableFolders.length === 0 ? (
          <p className="island-menu-empty">已在目前資料夾中</p>
        ) : (
          joinableFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className="create-menu-item"
              role="menuitem"
              onClick={() => {
                onMoveToFolder(folder.id)
                onClose()
              }}
            >
              <span className="create-menu-icon" aria-hidden="true">
                📁
              </span>
              <span>
                <strong>{folder.name}</strong>
                <small>移入此資料夾</small>
              </span>
            </button>
          ))
        )}

        {canRemoveFromFolder && (
          <button
            type="button"
            className="create-menu-item"
            role="menuitem"
            onClick={() => {
              onMoveToFolder(null)
              onClose()
            }}
          >
            <span className="create-menu-icon" aria-hidden="true">
              📤
            </span>
            <span>
              <strong>移出資料夾</strong>
              <small>放到未分類</small>
            </span>
          </button>
        )}

        <div className="island-menu-divider" />

        <button
          type="button"
          className="create-menu-item is-danger"
          role="menuitem"
          onClick={() => {
            onClose()
            onDelete()
          }}
        >
          <span className="create-menu-icon" aria-hidden="true">
            🗑
          </span>
          <span>
            <strong>刪除專案</strong>
            <small>刪除目前選取的專案</small>
          </span>
        </button>
      </div>
    </>
  )
}

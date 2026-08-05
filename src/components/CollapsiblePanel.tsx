import { useId, useState, type ReactNode } from 'react'

interface CollapsiblePanelProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  headerExtra?: ReactNode
  className?: string
  as?: 'section' | 'article'
  draggable?: boolean
  isDropTarget?: boolean
  onDelete?: () => void
  onDragStart?: (event: React.DragEvent) => void
  onDragOver?: (event: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (event: React.DragEvent) => void
  onDragEnd?: () => void
}

export function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
  headerExtra,
  className = '',
  as = 'section',
  draggable = false,
  isDropTarget = false,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentId = useId()
  const Tag = as

  return (
    <Tag
      className={`detail-panel ${open ? '' : 'is-collapsed'} ${isDropTarget ? 'is-drop-target' : ''} ${className}`.trim()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="panel-header">
        {draggable ? (
          <button
            type="button"
            className="panel-drag-handle"
            title="拖曳排序"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            aria-label={`拖曳${title}`}
          >
            ⋮⋮
          </button>
        ) : null}
        <button
          type="button"
          className="panel-toggle"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          title={open ? '收起' : '展開'}
        >
          <span aria-hidden="true">{open ? '−' : '＋'}</span>
          <span className="sr-only">{open ? '收起' : '展開'}</span>
        </button>
        <h2>{title}</h2>
        {headerExtra}
        {onDelete ? (
          <button
            type="button"
            className="panel-delete"
            onClick={onDelete}
            aria-label={`刪除${title}`}
            title="刪除區塊"
          >
            ×
          </button>
        ) : null}
      </header>
      {open ? (
        <div id={contentId} className="panel-body">
          {children}
        </div>
      ) : null}
    </Tag>
  )
}

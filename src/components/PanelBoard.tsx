import { Fragment, useState, type ReactNode } from 'react'

interface PanelBoardItemApi {
  dragging: boolean
  onDragStart: (event: React.DragEvent) => void
  onDragEnd: () => void
}

interface PanelBoardProps<T extends string> {
  layout: T[]
  onReorder: (next: T[]) => void
  renderItem: (panelId: T, api: PanelBoardItemApi) => ReactNode
}

function moveToGap<T extends string>(layout: T[], sourceId: T, gapIndex: number): T[] | null {
  const from = layout.indexOf(sourceId)
  if (from < 0) return null

  let insertAt = gapIndex
  if (from < gapIndex) insertAt -= 1
  if (insertAt === from) return null

  const next = [...layout]
  const [moved] = next.splice(from, 1)
  next.splice(insertAt, 0, moved)
  return next
}

export function PanelBoard<T extends string>({
  layout,
  onReorder,
  renderItem,
}: PanelBoardProps<T>) {
  const [draggingId, setDraggingId] = useState<T | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const clearDrag = () => {
    setDraggingId(null)
    setDropIndex(null)
  }

  const handleGapDragOver = (event: React.DragEvent, index: number) => {
    if (!draggingId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropIndex !== index) setDropIndex(index)
  }

  const handleGapDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    const sourceId = (event.dataTransfer.getData('text/plain') || draggingId) as T | null
    clearDrag()
    if (!sourceId) return
    const next = moveToGap(layout, sourceId, index)
    if (next) onReorder(next)
  }

  const renderGap = (index: number) => (
    <div
      key={`gap-${index}`}
      className={`panel-drop-gap ${draggingId ? 'is-visible' : ''} ${dropIndex === index ? 'is-active' : ''}`}
      onDragOver={(event) => handleGapDragOver(event, index)}
      onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
      onDrop={(event) => handleGapDrop(event, index)}
      aria-hidden={!draggingId}
    >
      <span className="panel-drop-line" />
    </div>
  )

  return (
    <div className={`panel-board ${draggingId ? 'is-reordering' : ''}`}>
      {layout.map((panelId, index) => (
        <Fragment key={panelId}>
          {renderGap(index)}
          {renderItem(panelId, {
            dragging: draggingId === panelId,
            onDragStart: (event) => {
              event.dataTransfer.setData('text/plain', panelId)
              event.dataTransfer.effectAllowed = 'move'
              setDraggingId(panelId)
              setDropIndex(null)
            },
            onDragEnd: clearDrag,
          })}
        </Fragment>
      ))}
      {renderGap(layout.length)}
    </div>
  )
}

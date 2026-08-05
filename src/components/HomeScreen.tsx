import { useEffect, useMemo, useState } from 'react'
import type {
  CreateFolderInput,
  CreateProjectInput,
  ProjectFolder,
  SavingsProject,
  SelectionMode,
} from '../types/savings'
import { formatDeadlineSummary, getRemainingDays } from '../utils/deadline'
import { formatAmount } from '../utils/money'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateMenu } from './CreateMenu'
import { CreateProjectModal } from './CreateProjectModal'
import { SelectionMenu } from './SelectionMenu'

interface HomeScreenProps {
  folders: ProjectFolder[]
  projects: SavingsProject[]
  onCreateProject: (input: CreateProjectInput) => void
  onCreateFolder: (input: CreateFolderInput) => void
  onDeleteProjects: (ids: string[]) => void
  onMoveProjectsToFolder: (ids: string[], folderId: string | null) => void
  onReorderFolders: (sourceId: string, targetId: string) => void
  onOpenProject: (projectId: string) => void
}

const DRAG_MIME = 'application/x-savings-project-ids'
const FOLDER_DRAG_MIME = 'application/x-savings-folder-id'

function getProgress(current: number, target: number) {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

function readDragIds(event: React.DragEvent) {
  const raw = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData('text/plain')
  if (!raw) return [] as string[]
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function HomeScreen({
  folders,
  projects,
  onCreateProject,
  onCreateFolder,
  onDeleteProjects,
  onMoveProjectsToFolder,
  onReorderFolders,
  onOpenProject,
}: HomeScreenProps) {
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dropTargetId, setDropTargetId] = useState<string | 'uncategorized' | null>(null)
  const [dragging, setDragging] = useState(false)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})

  const isFolderOpen = (key: string) => collapsedFolders[key] !== true

  const toggleFolder = (key: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => projects.some((project) => project.id === id)))
  }, [projects])

  useEffect(() => {
    if (selectedIds.length === 0) setSelectionMenuOpen(false)
  }, [selectedIds.length])

  const projectsByFolder = useMemo(() => {
    const map = new Map<string | null, SavingsProject[]>()
    map.set(null, [])
    for (const folder of folders) {
      map.set(folder.id, [])
    }
    for (const project of projects) {
      const key = project.folderId && map.has(project.folderId) ? project.folderId : null
      map.get(key)!.push(project)
    }
    return map
  }, [folders, projects])

  const toggleSelect = (projectId: string) => {
    setSelectedIds((prev) => {
      if (selectionMode === 'single') {
        return prev[0] === projectId ? [] : [projectId]
      }
      return prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    })
  }

  const handleDelete = () => {
    if (selectedIds.length === 0) return
    const label =
      selectedIds.length === 1
        ? '確定刪除這個專案嗎？'
        : `確定刪除選取的 ${selectedIds.length} 個專案嗎？`
    if (!window.confirm(label)) return
    onDeleteProjects(selectedIds)
    setSelectedIds([])
  }

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      const next = prev === 'single' ? 'multi' : 'single'
      if (next === 'single') {
        setSelectedIds((ids) => (ids.length > 0 ? [ids[0]] : []))
      }
      return next
    })
  }

  const moveSelectedToFolder = (folderId: string | null) => {
    if (selectedIds.length === 0) return
    onMoveProjectsToFolder(selectedIds, folderId)
  }

  const handleDragStart = (event: React.DragEvent, projectId: string) => {
    const ids =
      selectedIds.includes(projectId) && selectedIds.length > 0 ? selectedIds : [projectId]
    if (!selectedIds.includes(projectId)) {
      setSelectedIds(ids)
    }
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids))
    event.dataTransfer.setData('text/plain', JSON.stringify(ids))
    event.dataTransfer.effectAllowed = 'move'
    setDragging(true)
    setCreateMenuOpen(false)
    setSelectionMenuOpen(false)
  }

  const handleDragEnd = () => {
    setDragging(false)
    setDropTargetId(null)
  }

  const handleZoneDragOver = (
    event: React.DragEvent,
    targetId: string | 'uncategorized',
  ) => {
    if (draggingFolderId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(targetId)
  }

  const handleZoneDrop = (
    event: React.DragEvent,
    targetId: string | 'uncategorized',
  ) => {
    if (draggingFolderId) return
    event.preventDefault()
    const ids = readDragIds(event)
    const folderId = targetId === 'uncategorized' ? null : targetId
    if (ids.length > 0) {
      onMoveProjectsToFolder(ids, folderId)
      setSelectedIds(ids)
    }
    setDropTargetId(null)
    setDragging(false)
  }

  const handleFolderDragStart = (event: React.DragEvent, folderId: string) => {
    event.dataTransfer.setData(FOLDER_DRAG_MIME, folderId)
    event.dataTransfer.setData('text/plain', folderId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingFolderId(folderId)
    setDropTargetId(null)
    setCreateMenuOpen(false)
    setSelectionMenuOpen(false)
  }

  const handleFolderDragOver = (event: React.DragEvent, folderId: string) => {
    if (!draggingFolderId || draggingFolderId === folderId) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setFolderDropTargetId(folderId)
  }

  const handleFolderDrop = (event: React.DragEvent, targetId: string) => {
    if (!draggingFolderId) return
    event.preventDefault()
    event.stopPropagation()
    const sourceId =
      event.dataTransfer.getData(FOLDER_DRAG_MIME) ||
      event.dataTransfer.getData('text/plain') ||
      draggingFolderId
    if (sourceId) onReorderFolders(sourceId, targetId)
    setDraggingFolderId(null)
    setFolderDropTargetId(null)
  }

  const handleFolderDragEnd = () => {
    setDraggingFolderId(null)
    setFolderDropTargetId(null)
  }

  const renderProjectCard = (project: SavingsProject) => {
    const progress = getProgress(project.currentAmount, project.targetAmount)
    const remainingDays = getRemainingDays(project)
    const deadlineClass =
      remainingDays < 0 ? 'is-overdue' : remainingDays === 0 ? 'is-due-today' : ''
    const selected = selectedIds.includes(project.id)

    return (
      <li key={project.id}>
        <div
          className={`project-card ${selected ? 'is-selected' : ''}`}
          draggable
          onClick={() => onOpenProject(project.id)}
          onDragStart={(event) => handleDragStart(event, project.id)}
          onDragEnd={handleDragEnd}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenProject(project.id)
            }
          }}
        >
          <div className="project-card-top">
            <div className="project-select">
              <button
                type="button"
                className={`select-indicator ${selectionMode === 'multi' ? 'is-checkbox' : 'is-radio'} ${selected ? 'is-checked' : ''}`}
                aria-label={selected ? '取消選取專案' : '選取專案'}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleSelect(project.id)
                }}
              />
              <h2>{project.name}</h2>
            </div>
            <span className="progress-badge">{progress}%</span>
          </div>
          <p className="project-amounts">
            {formatAmount(project.currentAmount)}
            <span> / {formatAmount(project.targetAmount)}</span>
          </p>
          <p className={`project-deadline ${deadlineClass}`}>{formatDeadlineSummary(project)}</p>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </li>
    )
  }

  const uncategorized = projectsByFolder.get(null) ?? []
  const hasAnyContent = folders.length > 0 || projects.length > 0
  const hasSelection = selectedIds.length > 0
  const selectedProjects = selectedIds
    .map((id) => projects.find((item) => item.id === id))
    .filter((project): project is SavingsProject => Boolean(project))

  const canRemoveFromFolder = selectedProjects.some(
    (project) =>
      Boolean(project.folderId) && folders.some((folder) => folder.id === project.folderId),
  )

  // Hide folders that every selected project already belongs to.
  const currentFolderIds =
    selectedProjects.length === 0
      ? []
      : folders
          .map((folder) => folder.id)
          .filter((folderId) =>
            selectedProjects.every((project) => project.folderId === folderId),
          )

  return (
    <div
      className={`home-screen ${dragging ? 'is-dragging' : ''} ${draggingFolderId ? 'is-reordering-folders' : ''}`}
    >
      <div className="floating-dock floating-dock-left">
        <div className={`island-wrap ${hasSelection ? 'is-visible' : 'is-hidden'}`}>
          <button
            type="button"
            className="island-button"
            aria-label="專案操作"
            aria-haspopup="menu"
            aria-expanded={selectionMenuOpen}
            disabled={!hasSelection}
            onClick={() => {
              setCreateMenuOpen(false)
              setSelectionMenuOpen((open) => !open)
            }}
          >
            <span className="more-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
          <SelectionMenu
            open={selectionMenuOpen && hasSelection}
            folders={folders}
            selectionMode={selectionMode}
            selectedCount={selectedIds.length}
            canRemoveFromFolder={canRemoveFromFolder}
            currentFolderIds={currentFolderIds}
            onClose={() => setSelectionMenuOpen(false)}
            onToggleSelectionMode={toggleSelectionMode}
            onMoveToFolder={moveSelectedToFolder}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <div className="floating-dock floating-dock-right">
        <div className="island-wrap">
          <button
            type="button"
            className="island-button"
            aria-label="建立"
            aria-haspopup="menu"
            aria-expanded={createMenuOpen}
            onClick={() => {
              setSelectionMenuOpen(false)
              setCreateMenuOpen((open) => !open)
            }}
          >
            ＋
          </button>
          <CreateMenu
            open={createMenuOpen}
            onClose={() => setCreateMenuOpen(false)}
            onCreateFolder={() => setFolderModalOpen(true)}
            onCreateProject={() => setProjectModalOpen(true)}
          />
        </div>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Savings Tracker</p>
          <h1>存錢系統</h1>
          <p className="subtitle">
            點擊專案可進入詳情；點左側圓點可選取，再用左上角 ⋯ 整理資料夾。
          </p>
        </div>
      </header>

      <section className="projects-section">
        {!hasAnyContent ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              💰
            </div>
            <h2>還沒有任何內容</h2>
            <p>點擊右上角「＋」，建立資料夾或存錢專案。</p>
          </div>
        ) : (
          <div className="content-stack">
            {folders.length > 0 && (
              <section
                className={`folder-block ${isFolderOpen('__folders__') ? '' : 'is-collapsed'}`}
              >
                <header className="folder-header">
                  <button
                    type="button"
                    className="panel-toggle"
                    aria-expanded={isFolderOpen('__folders__')}
                    aria-controls="folder-group-body"
                    onClick={() => toggleFolder('__folders__')}
                    title={isFolderOpen('__folders__') ? '收起' : '展開'}
                  >
                    <span aria-hidden="true">{isFolderOpen('__folders__') ? '−' : '＋'}</span>
                    <span className="sr-only">
                      {isFolderOpen('__folders__') ? '收起' : '展開'}
                    </span>
                  </button>
                  <div className="folder-title">
                    <h2>資料夾</h2>
                    <p className="folder-hint">按住左側 ⋮⋮ 可拖動排序</p>
                  </div>
                  <span className="folder-count">{folders.length} 個資料夾</span>
                </header>
                {isFolderOpen('__folders__') ? (
                  <div id="folder-group-body" className="folder-body folder-group">
                    {folders.map((folder) => {
                      const folderProjects = projectsByFolder.get(folder.id) ?? []
                      const isDropTarget = !draggingFolderId && dropTargetId === folder.id
                      const isReorderTarget = folderDropTargetId === folder.id
                      const open = isFolderOpen(folder.id)
                      const contentId = `folder-body-${folder.id}`

                      return (
                        <section
                          key={folder.id}
                          className={`folder-item drop-zone ${open ? '' : 'is-collapsed'} ${isDropTarget ? 'is-drop-target' : ''} ${isReorderTarget ? 'is-reorder-target' : ''} ${draggingFolderId === folder.id ? 'is-dragging-folder' : ''}`}
                          onDragOver={(event) => {
                            if (draggingFolderId) {
                              handleFolderDragOver(event, folder.id)
                              return
                            }
                            handleZoneDragOver(event, folder.id)
                          }}
                          onDragLeave={() => {
                            setDropTargetId((current) => (current === folder.id ? null : current))
                            setFolderDropTargetId((current) =>
                              current === folder.id ? null : current,
                            )
                          }}
                          onDrop={(event) => {
                            if (draggingFolderId) {
                              handleFolderDrop(event, folder.id)
                              return
                            }
                            handleZoneDrop(event, folder.id)
                          }}
                        >
                          <header className="folder-header">
                            <button
                              type="button"
                              className="panel-drag-handle"
                              title="拖曳排序"
                              draggable
                              onDragStart={(event) => handleFolderDragStart(event, folder.id)}
                              onDragEnd={handleFolderDragEnd}
                              aria-label={`拖曳${folder.name}`}
                            >
                              ⋮⋮
                            </button>
                            <button
                              type="button"
                              className="panel-toggle"
                              aria-expanded={open}
                              aria-controls={contentId}
                              onClick={() => toggleFolder(folder.id)}
                              title={open ? '收起' : '展開'}
                            >
                              <span aria-hidden="true">{open ? '−' : '＋'}</span>
                              <span className="sr-only">{open ? '收起' : '展開'}</span>
                            </button>
                            <div className="folder-title">
                              <h3>{folder.name}</h3>
                            </div>
                            <span className="folder-count">{folderProjects.length} 個專案</span>
                          </header>
                          {open ? (
                            <div id={contentId} className="folder-body">
                              {folderProjects.length === 0 ? (
                                <p className="folder-empty">
                                  拖曳專案到這裡，或用 ⋯ 選單加入
                                </p>
                              ) : (
                                <ul className="project-list">
                                  {folderProjects.map(renderProjectCard)}
                                </ul>
                              )}
                            </div>
                          ) : null}
                        </section>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            )}

            {(uncategorized.length > 0 || folders.length > 0) && (
              <section
                className={`folder-block drop-zone ${isFolderOpen('uncategorized') ? '' : 'is-collapsed'} ${dropTargetId === 'uncategorized' ? 'is-drop-target' : ''}`}
                onDragOver={(event) => handleZoneDragOver(event, 'uncategorized')}
                onDragLeave={() =>
                  setDropTargetId((current) => (current === 'uncategorized' ? null : current))
                }
                onDrop={(event) => handleZoneDrop(event, 'uncategorized')}
              >
                {folders.length > 0 ? (
                  <>
                    <header className="folder-header">
                      <button
                        type="button"
                        className="panel-toggle"
                        aria-expanded={isFolderOpen('uncategorized')}
                        aria-controls="folder-body-uncategorized"
                        onClick={() => toggleFolder('uncategorized')}
                        title={isFolderOpen('uncategorized') ? '收起' : '展開'}
                      >
                        <span aria-hidden="true">{isFolderOpen('uncategorized') ? '−' : '＋'}</span>
                        <span className="sr-only">
                          {isFolderOpen('uncategorized') ? '收起' : '展開'}
                        </span>
                      </button>
                      <div className="folder-title">
                        <h2>一般專案</h2>
                      </div>
                      <span className="folder-count">{uncategorized.length} 個專案</span>
                    </header>
                    {isFolderOpen('uncategorized') ? (
                      <div id="folder-body-uncategorized" className="folder-body">
                        {uncategorized.length === 0 ? (
                          <p className="folder-empty">拖曳專案到這裡可移出資料夾</p>
                        ) : (
                          <ul className="project-list">{uncategorized.map(renderProjectCard)}</ul>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="folder-body">
                    <ul className="project-list">{uncategorized.map(renderProjectCard)}</ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </section>

      <CreateProjectModal
        open={projectModalOpen}
        folders={folders}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={onCreateProject}
      />
      <CreateFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSubmit={onCreateFolder}
      />
    </div>
  )
}

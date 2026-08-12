import { useEffect, useMemo, useState } from 'react'
import { APP_NAME, APP_TAGLINE_EN } from '../config/brand'
import type {
  CreateFolderInput,
  CreateProjectInput,
  ProjectFolder,
  SavingsProject,
  SelectionMode,
} from '../types/savings'
import { formatDeadlineSummary, getCurrentStageStatus, getRemainingDays } from '../utils/deadline'
import { pickHomeQuote } from '../utils/homeQuotes'
import { formatAmount } from '../utils/money'
import { AccountMenu } from './AccountMenu'
import { EmptyStarArt } from './BrandDecor'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateMenu } from './CreateMenu'
import { CreateProjectModal } from './CreateProjectModal'
import { HomeTips, SAVINGS_HOME_TIPS_KEY } from './HomeTips'
import { NoteEditModal } from './NoteEditModal'
import { RenameModal } from './RenameModal'
import { SelectionMenu } from './SelectionMenu'
import { WishPool } from './WishPool'

interface HomeScreenProps {
  username: string
  isGuest: boolean
  folders: ProjectFolder[]
  projects: SavingsProject[]
  onCreateProject: (input: CreateProjectInput) => void
  onCreateFolder: (input: CreateFolderInput) => void
  onDeleteProjects: (ids: string[]) => void
  onDeleteFolders: (ids: string[]) => void
  onMoveProjectsToFolder: (ids: string[], folderId: string | null) => void
  onReorderFolders: (sourceId: string, targetId: string) => void
  onUpdateProjectNote: (projectId: string, note: string) => void
  onUpdateProjectName: (projectId: string, name: string) => void
  onUpdateFolderNote: (folderId: string, note: string) => void
  onUpdateFolderName: (folderId: string, name: string) => void
  onOpenProject: (projectId: string) => void
  onLogout: () => void
  onGoToLogin: () => void
  onOpenInstallGuide: () => void
  onOpenUsageGuide: () => void
  onOpenPrivacy: () => void
  onOpenSettings: () => void
  onOpenPeriodic: () => void
  createProjectOpen: boolean
  onCreateProjectOpenChange: (open: boolean) => void
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
  username,
  isGuest,
  folders,
  projects,
  onCreateProject,
  onCreateFolder,
  onDeleteProjects,
  onDeleteFolders,
  onMoveProjectsToFolder,
  onReorderFolders,
  onUpdateProjectNote,
  onUpdateProjectName,
  onUpdateFolderNote,
  onUpdateFolderName,
  onOpenProject,
  onLogout,
  onGoToLogin,
  onOpenInstallGuide,
  onOpenUsageGuide,
  onOpenPrivacy,
  onOpenSettings,
  onOpenPeriodic,
  createProjectOpen,
  onCreateProjectOpenChange,
}: HomeScreenProps) {
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dropTargetId, setDropTargetId] = useState<string | 'uncategorized' | null>(null)
  const [dragging, setDragging] = useState(false)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const [noteTarget, setNoteTarget] = useState<
    | { type: 'project'; id: string; name: string; note?: string }
    | { type: 'folder'; id: string; name: string; note?: string }
    | null
  >(null)
  const [renameTarget, setRenameTarget] = useState<
    { type: 'project' | 'folder'; id: string; name: string } | null
  >(null)
  const [homeQuote] = useState(pickHomeQuote)

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

  const totals = useMemo(() => {
    const saved = projects.reduce((sum, project) => sum + project.currentAmount, 0)
    const pending = projects.filter((project) => {
      if (project.currentAmount >= project.targetAmount) return false
      return !getCurrentStageStatus(project).done
    }).length
    return { saved, pending }
  }, [projects])

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
    const stage = getCurrentStageStatus(project)

    return (
      <li key={project.id}>
        <div
          className={`project-card ${selected ? 'is-selected' : ''} ${stage.done ? 'is-stage-done' : 'is-stage-pending'}`}
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
              <div>
                <h2>{project.name}</h2>
                {project.note?.trim() ? <p className="entity-note">{project.note}</p> : null}
              </div>
            </div>
            <span className="progress-badge">{progress}%</span>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="project-card-footer">
            <span>
              {formatAmount(project.currentAmount)} / {formatAmount(project.targetAmount)}
            </span>
            <span className={`project-card-meta ${deadlineClass}`}>
              <em className={`stage-pill ${stage.done ? 'is-done' : 'is-pending'}`}>{stage.label}</em>
              {formatDeadlineSummary(project)}
            </span>
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

  const selectedSingleProject =
    selectedProjects.length === 1 ? selectedProjects[0] : null

  return (
    <div
      className={`home-screen ${dragging ? 'is-dragging' : ''} ${draggingFolderId ? 'is-reordering-folders' : ''}`}
    >
      <div className="floating-dock floating-dock-left">
        <button
          type="button"
          className="account-chip"
          title={isGuest ? `${username}（訪客模式）` : username}
          aria-haspopup="dialog"
          aria-expanded={accountMenuOpen}
          onClick={() => {
            setCreateMenuOpen(false)
            setSelectionMenuOpen(false)
            setAccountMenuOpen(true)
          }}
        >
          <span className="account-chip-name">{username}</span>
          {isGuest ? <span className="guest-badge">訪客</span> : null}
        </button>
        <AccountMenu
          open={accountMenuOpen}
          username={username}
          isGuest={isGuest}
          activeSystem="home"
          onClose={() => setAccountMenuOpen(false)}
          onOpenSettings={onOpenSettings}
          onOpenHome={() => setAccountMenuOpen(false)}
          onOpenPeriodic={onOpenPeriodic}
          onOpenUsageGuide={onOpenUsageGuide}
          onOpenPrivacy={onOpenPrivacy}
          onLogout={onLogout}
          onGoToLogin={onGoToLogin}
        />
        <div className={`island-wrap ${hasSelection ? 'is-visible' : 'is-hidden'}`}>
          <button
            type="button"
            className="island-button"
            aria-label="專案操作"
            aria-haspopup="menu"
            aria-expanded={selectionMenuOpen}
            disabled={!hasSelection}
            onClick={() => {
              setAccountMenuOpen(false)
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
            hasNote={Boolean(selectedSingleProject?.note)}
            onClose={() => setSelectionMenuOpen(false)}
            onToggleSelectionMode={toggleSelectionMode}
            onRename={
              selectedSingleProject
                ? () =>
                    setRenameTarget({
                      type: 'project',
                      id: selectedSingleProject.id,
                      name: selectedSingleProject.name,
                    })
                : undefined
            }
            onEditNote={
              selectedSingleProject
                ? () =>
                    setNoteTarget({
                      type: 'project',
                      id: selectedSingleProject.id,
                      name: selectedSingleProject.name,
                      note: selectedSingleProject.note,
                    })
                : undefined
            }
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
              setAccountMenuOpen(false)
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
            onCreateProject={() => onCreateProjectOpenChange(true)}
          />
        </div>
      </div>

      <WishPool />

      <header className="page-header">
        <div>
          <p className="eyebrow">{APP_TAGLINE_EN}</p>
          <h1 className="brand-display">{APP_NAME}</h1>
          <p className="subtitle">{homeQuote}</p>
        </div>
      </header>

      {projects.length > 0 ? (
        <section className="periodic-summary-strip" aria-label="總覽">
          <div className="stat-card">
            <span>進行中專案</span>
            <strong>{projects.length}</strong>
          </div>
          <div className="stat-card">
            <span>累計已存</span>
            <strong>{formatAmount(totals.saved)}</strong>
          </div>
          <div className="stat-card">
            <span>待完成</span>
            <strong>{totals.pending} 筆</strong>
          </div>
        </section>
      ) : null}

      <section className="projects-section">
        {isGuest ? (
          <div className="sync-callout" role="status">
            <strong>訪客模式不會跨裝置同步</strong>
            <p>
              手機網頁版與主畫面版的訪客資料是分開的。請兩邊都按「登入」，使用同一個正式帳號，資料就會自動對齊。
            </p>
            <button type="button" className="button button-primary button-compact" onClick={onGoToLogin}>
              立即登入同步
            </button>
          </div>
        ) : null}
        {!hasAnyContent ? (
          <div className="empty-state empty-state-start">
            <EmptyStarArt />
            <h2>開始你的第一筆慢存</h2>
            <p>可選日存、周存、月存，或自訂每幾天存一次。</p>
            <div className="empty-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => onCreateProjectOpenChange(true)}
              >
                建立存錢專案
              </button>
              <button type="button" className="button button-secondary" onClick={onOpenUsageGuide}>
                使用教學
              </button>
            </div>
            <ol className="empty-flow">
              <li>
                <strong>1</strong>
                <span>建立專案</span>
              </li>
              <li>
                <strong>2</strong>
                <span>點進去存錢</span>
              </li>
              <li>
                <strong>3</strong>
                <span>登入正式帳號以同步</span>
              </li>
            </ol>
            <button type="button" className="text-link-button" onClick={onOpenInstallGuide}>
              想加到手機主畫面？看安裝步驟
            </button>
          </div>
        ) : (
          <>
            <HomeTips storageKey={SAVINGS_HOME_TIPS_KEY}>
              點擊右上「＋」新增存錢計畫專案 或
              <button type="button" className="home-tips-link" onClick={onOpenUsageGuide}>
                點擊查看使用教學
              </button>
            </HomeTips>
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
                              {folder.note ? <p className="entity-note">{folder.note}</p> : null}
                            </div>
                            <div className="folder-header-actions">
                              <span className="folder-count">{folderProjects.length} 個專案</span>
                              <div className="folder-menu-wrap">
                                <button
                                  type="button"
                                  className="panel-toggle"
                                  aria-label={`${folder.name}選單`}
                                  aria-haspopup="menu"
                                  aria-expanded={folderMenuId === folder.id}
                                  title="更多"
                                  onClick={() =>
                                    setFolderMenuId((current) =>
                                      current === folder.id ? null : folder.id,
                                    )
                                  }
                                >
                                  <span aria-hidden="true">⋯</span>
                                </button>
                                {folderMenuId === folder.id && (
                                  <>
                                    <button
                                      type="button"
                                      className="menu-scrim"
                                      aria-label="關閉選單"
                                      onClick={() => setFolderMenuId(null)}
                                    />
                                    <div className="folder-item-menu" role="menu">
                                      <button
                                        type="button"
                                        className="create-menu-item"
                                        role="menuitem"
                                        onClick={() => {
                                          setFolderMenuId(null)
                                          setRenameTarget({
                                            type: 'folder',
                                            id: folder.id,
                                            name: folder.name,
                                          })
                                        }}
                                      >
                                        <span className="create-menu-icon" aria-hidden="true">
                                          ✎
                                        </span>
                                        <span>
                                          <strong>更改資料夾名稱</strong>
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="create-menu-item"
                                        role="menuitem"
                                        onClick={() => {
                                          setFolderMenuId(null)
                                          setNoteTarget({
                                            type: 'folder',
                                            id: folder.id,
                                            name: folder.name,
                                            note: folder.note,
                                          })
                                        }}
                                      >
                                        <span className="create-menu-icon" aria-hidden="true">
                                          📝
                                        </span>
                                        <span>
                                          <strong>
                                            {folder.note ? '編輯備註' : '新增備註'}
                                          </strong>
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="create-menu-item"
                                        role="menuitem"
                                        onClick={() => {
                                          setFolderMenuId(null)
                                          if (
                                            window.confirm(
                                              `確定刪除資料夾「${folder.name}」？內含專案會移到未分類。`,
                                            )
                                          ) {
                                            onDeleteFolders([folder.id])
                                          }
                                        }}
                                      >
                                        <span className="create-menu-icon" aria-hidden="true">
                                          🗑
                                        </span>
                                        <span>
                                          <strong>刪除資料夾</strong>
                                        </span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </header>
                          {open && folderProjects.length > 0 ? (
                            <div id={contentId} className="folder-body">
                              <ul className="project-list">
                                {folderProjects.map(renderProjectCard)}
                              </ul>
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
          </>
        )}
      </section>

      <CreateProjectModal
        open={createProjectOpen}
        folders={folders}
        onClose={() => onCreateProjectOpenChange(false)}
        onSubmit={onCreateProject}
      />
      <CreateFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSubmit={onCreateFolder}
      />
      <NoteEditModal
        open={Boolean(noteTarget)}
        title={
          noteTarget
            ? `${noteTarget.note ? '編輯' : '新增'}備註 · ${noteTarget.name}`
            : '備註'
        }
        initialNote={noteTarget?.note}
        onClose={() => setNoteTarget(null)}
        onSave={(note) => {
          if (!noteTarget) return
          if (noteTarget.type === 'project') onUpdateProjectNote(noteTarget.id, note)
          else onUpdateFolderNote(noteTarget.id, note)
        }}
      />
      <RenameModal
        open={Boolean(renameTarget)}
        title={
          renameTarget?.type === 'folder' ? '更改資料夾名稱' : '更改專案名稱'
        }
        fieldLabel={renameTarget?.type === 'folder' ? '資料夾名稱' : '專案名稱'}
        placeholder={
          renameTarget?.type === 'folder'
            ? '輸入新的資料夾名稱'
            : '輸入新的專案名稱'
        }
        initialName={renameTarget?.name ?? ''}
        onClose={() => setRenameTarget(null)}
        onSave={(name) => {
          if (!renameTarget) return
          if (renameTarget.type === 'folder') onUpdateFolderName(renameTarget.id, name)
          else onUpdateProjectName(renameTarget.id, name)
        }}
      />
    </div>
  )
}

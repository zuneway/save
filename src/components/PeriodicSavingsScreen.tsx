import { useEffect, useMemo, useState } from 'react'
import type { CreatePeriodicPlanInput, PeriodicPlan } from '../types/periodic'
import type { CreateFolderInput, ProjectFolder, SelectionMode } from '../types/savings'
import { pickHomeQuote } from '../utils/homeQuotes'
import { formatAmount } from '../utils/money'
import {
  formatPeriodicDate,
  getNextPeriodicPeriod,
  getPeriodicProgressPercent,
  getPeriodicSavedAmount,
  getPeriodicTargetAmount,
} from '../utils/periodic'
import { AccountMenu } from './AccountMenu'
import { CreateFolderModal } from './CreateFolderModal'
import { CreateMenu } from './CreateMenu'
import { CreatePeriodicPlanModal } from './CreatePeriodicPlanModal'
import { HomeTips, PERIODIC_HOME_TIPS_KEY } from './HomeTips'
import { NoteEditModal } from './NoteEditModal'
import { RenameModal } from './RenameModal'
import { SelectionMenu } from './SelectionMenu'
import {
  UsageGuide,
  hasSeenPeriodicUsageGuide,
  markPeriodicUsageGuideSeen,
} from './UsageGuide'

interface PeriodicSavingsScreenProps {
  username: string
  isGuest: boolean
  folders: ProjectFolder[]
  plans: PeriodicPlan[]
  onCreatePlan: (input: CreatePeriodicPlanInput) => void
  onCreateFolder: (input: CreateFolderInput) => void
  onUpdateFolderName: (folderId: string, name: string) => void
  onUpdateFolderNote: (folderId: string, note: string) => void
  onDeleteFolders: (ids: string[]) => void
  onMovePlansToFolder: (ids: string[], folderId: string | null) => void
  onReorderFolders: (sourceId: string, targetId: string) => void
  onDeletePlans: (ids: string[]) => void
  onOpenPlan: (planId: string) => void
  onOpenHome: () => void
  onOpenPrivacy: () => void
  onOpenSettings: () => void
  onLogout: () => void
  onGoToLogin: () => void
}

const PLAN_DRAG_MIME = 'application/x-periodic-plan-ids'
const FOLDER_DRAG_MIME = 'application/x-periodic-folder-id'

function readDragIds(event: React.DragEvent) {
  const raw = event.dataTransfer.getData(PLAN_DRAG_MIME) || event.dataTransfer.getData('text/plain')
  if (!raw) return [] as string[]
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function PeriodicSavingsScreen({
  username,
  isGuest,
  folders,
  plans,
  onCreatePlan,
  onCreateFolder,
  onUpdateFolderName,
  onUpdateFolderNote,
  onDeleteFolders,
  onMovePlansToFolder,
  onReorderFolders,
  onDeletePlans,
  onOpenPlan,
  onOpenHome,
  onOpenPrivacy,
  onOpenSettings,
  onLogout,
  onGoToLogin,
}: PeriodicSavingsScreenProps) {
  const [homeQuote] = useState(pickHomeQuote)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [usageGuideOpen, setUsageGuideOpen] = useState(false)

  useEffect(() => {
    if (!hasSeenPeriodicUsageGuide()) setUsageGuideOpen(true)
  }, [])
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({})
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [folderDropTargetId, setFolderDropTargetId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{
    type: 'folder'
    id: string
    name: string
  } | null>(null)
  const [noteTarget, setNoteTarget] = useState<{
    type: 'folder'
    id: string
    name: string
    note?: string
  } | null>(null)

  const totals = useMemo(() => {
    const saved = plans.reduce((sum, plan) => sum + getPeriodicSavedAmount(plan), 0)
    const dueSoon = plans
      .map((plan) => getNextPeriodicPeriod(plan))
      .filter((period) => period && (period.status === 'due' || period.status === 'missed')).length
    return { saved, dueSoon }
  }, [plans])

  const folderIdSet = useMemo(() => new Set(folders.map((folder) => folder.id)), [folders])

  const plansByFolder = useMemo(() => {
    const map = new Map<string, PeriodicPlan[]>()
    for (const folder of folders) map.set(folder.id, [])
    const uncategorized: PeriodicPlan[] = []
    for (const plan of plans) {
      if (plan.folderId && folderIdSet.has(plan.folderId)) {
        map.get(plan.folderId)?.push(plan)
      } else {
        uncategorized.push(plan)
      }
    }
    return { map, uncategorized }
  }, [folders, plans, folderIdSet])

  const hasAnyContent = plans.length > 0 || folders.length > 0
  const selectedPlans = plans.filter((plan) => selectedIds.includes(plan.id))
  const canRemoveFromFolder = selectedPlans.some((plan) => plan.folderId != null)
  const currentFolderIds = [
    ...new Set(
      selectedPlans
        .map((plan) => plan.folderId)
        .filter((id): id is string => typeof id === 'string'),
    ),
  ]

  const isFolderOpen = (id: string) => collapsedFolders[id] !== true
  const toggleFolder = (id: string) => {
    setCollapsedFolders((current) => ({ ...current, [id]: !current[id] }))
  }

  const toggleSelect = (planId: string) => {
    setSelectedIds((current) => {
      if (selectionMode === 'single') {
        return current.includes(planId) && current.length === 1 ? [] : [planId]
      }
      return current.includes(planId)
        ? current.filter((id) => id !== planId)
        : [...current, planId]
    })
  }

  const handleDragStart = (event: React.DragEvent, planId: string) => {
    const ids =
      selectedIds.includes(planId) && selectedIds.length > 0 ? selectedIds : [planId]
    if (!selectedIds.includes(planId)) setSelectedIds(ids)
    event.dataTransfer.setData(PLAN_DRAG_MIME, JSON.stringify(ids))
    event.dataTransfer.setData('text/plain', JSON.stringify(ids))
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleZoneDragOver = (event: React.DragEvent, zoneId: string) => {
    if (draggingFolderId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(zoneId)
  }

  const handleZoneDrop = (event: React.DragEvent, folderId: string | null) => {
    event.preventDefault()
    const ids = readDragIds(event)
    if (ids.length > 0) onMovePlansToFolder(ids, folderId === 'uncategorized' ? null : folderId)
    setDropTargetId(null)
  }

  const handleFolderDragStart = (event: React.DragEvent, folderId: string) => {
    event.dataTransfer.setData(FOLDER_DRAG_MIME, folderId)
    event.dataTransfer.setData('text/plain', folderId)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingFolderId(folderId)
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

  const renderPlanCard = (plan: PeriodicPlan) => {
    const next = getNextPeriodicPeriod(plan)
    const saved = getPeriodicSavedAmount(plan)
    const target = getPeriodicTargetAmount(plan)
    const progress = getPeriodicProgressPercent(plan)
    const selected = selectedIds.includes(plan.id)

    return (
      <li key={plan.id}>
        <div
          className={`project-card periodic-plan-card ${selected ? 'is-selected' : ''}`}
          draggable
          onClick={() => onOpenPlan(plan.id)}
          onDragStart={(event) => handleDragStart(event, plan.id)}
          onDragEnd={() => setDropTargetId(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenPlan(plan.id)
            }
          }}
        >
          <div className="project-card-top">
            <div className="project-select">
              <button
                type="button"
                className={`select-indicator ${selectionMode === 'multi' ? 'is-checkbox' : 'is-radio'} ${selected ? 'is-checked' : ''}`}
                aria-label={selected ? '取消選取計畫' : '選取計畫'}
                aria-pressed={selected}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleSelect(plan.id)
                }}
              />
              <div>
                <h2>{plan.name}</h2>
                {plan.note?.trim() ? <p className="entity-note">{plan.note}</p> : null}
              </div>
            </div>
            <span className="progress-badge">
              {progress != null ? `${progress}%` : `${plan.completedDates.length} 期`}
            </span>
          </div>

          {progress != null ? (
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          ) : null}

          <div className="project-card-footer">
            <span>
              已存 {formatAmount(saved)}
              {target != null ? ` / ${formatAmount(target)}` : ''}
            </span>
            <span>{next ? `下一筆 ${formatPeriodicDate(next.date)}` : '期程已結束'}</span>
          </div>
        </div>
      </li>
    )
  }

  return (
    <div
      className={`home-screen periodic-home-screen ${draggingFolderId ? 'is-reordering-folders' : ''}`}
    >
      <div className="floating-dock floating-dock-left">
        <button
          type="button"
          className="account-chip"
          title={isGuest ? `${username}（訪客模式）` : username}
          aria-haspopup="dialog"
          aria-expanded={accountMenuOpen}
          onClick={() => setAccountMenuOpen(true)}
        >
          <span className="account-chip-name">{username}</span>
          {isGuest ? <span className="guest-badge">訪客</span> : null}
        </button>
        <AccountMenu
          open={accountMenuOpen}
          username={username}
          isGuest={isGuest}
          activeSystem="periodic"
          onClose={() => setAccountMenuOpen(false)}
          onOpenSettings={onOpenSettings}
          onOpenHome={onOpenHome}
          onOpenPeriodic={() => setAccountMenuOpen(false)}
          onOpenUsageGuide={() => setUsageGuideOpen(true)}
          onOpenPrivacy={onOpenPrivacy}
          onLogout={onLogout}
          onGoToLogin={onGoToLogin}
        />

        <div className={`island-wrap ${selectedIds.length > 0 ? 'is-visible' : 'is-hidden'}`}>
          <button
            type="button"
            className="island-button"
            aria-label="計畫操作"
            aria-haspopup="menu"
            aria-expanded={selectionMenuOpen}
            disabled={selectedIds.length === 0}
            onClick={() => {
              setAccountMenuOpen(false)
              setCreateMenuOpen(false)
              setSelectionMenuOpen((open) => !open)
            }}
          >
            ⋯
          </button>
          <SelectionMenu
            open={selectionMenuOpen && selectedIds.length > 0}
            folders={folders}
            selectionMode={selectionMode}
            selectedCount={selectedIds.length}
            canRemoveFromFolder={canRemoveFromFolder}
            currentFolderIds={currentFolderIds}
            onClose={() => setSelectionMenuOpen(false)}
            onToggleSelectionMode={() =>
              setSelectionMode((mode) => (mode === 'single' ? 'multi' : 'single'))
            }
            onMoveToFolder={(folderId) => {
              onMovePlansToFolder(selectedIds, folderId)
              setSelectedIds([])
            }}
            onDelete={() => {
              if (
                window.confirm(
                  `確定刪除選取的 ${selectedIds.length} 個計畫？此操作無法復原。`,
                )
              ) {
                onDeletePlans(selectedIds)
                setSelectedIds([])
              }
            }}
          />
        </div>
      </div>

      <div className="floating-dock floating-dock-right">
        <div className="island-wrap">
          <button
            type="button"
            className="island-button create-fab"
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
            variant="periodic"
            onClose={() => setCreateMenuOpen(false)}
            onCreateFolder={() => setFolderModalOpen(true)}
            onCreateProject={() => setCreateOpen(true)}
          />
        </div>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">keep it steady</p>
          <h1 className="brand-display">定期儲蓄</h1>
          <p className="subtitle">{homeQuote}</p>
        </div>
      </header>

      {plans.length > 0 ? (
        <section className="periodic-summary-strip" aria-label="總覽">
          <div className="stat-card">
            <span>進行中計畫</span>
            <strong>{plans.length}</strong>
          </div>
          <div className="stat-card">
            <span>累計已存</span>
            <strong>{formatAmount(totals.saved)}</strong>
          </div>
          <div className="stat-card">
            <span>待處理</span>
            <strong>{totals.dueSoon} 筆</strong>
          </div>
        </section>
      ) : null}

      <section className="projects-section">
        {!hasAnyContent ? (
          <div className="empty-state empty-state-start">
            <div className="empty-icon" aria-hidden="true">
              📅
            </div>
            <h2>建立你的第一個定期計畫</h2>
            <p>設定每日／每周／每月或自訂間隔，系統會自動排出期程。</p>
            <div className="empty-actions">
              <button type="button" className="button button-primary" onClick={() => setCreateOpen(true)}>
                建立定期儲蓄
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setFolderModalOpen(true)}
              >
                建立資料夾
              </button>
            </div>
            <ol className="empty-flow">
              <li>
                <strong>1</strong>
                <span>選頻率與金額</span>
              </li>
              <li>
                <strong>2</strong>
                <span>到日期標記已存入</span>
              </li>
              <li>
                <strong>3</strong>
                <span>用資料夾整理計畫</span>
              </li>
            </ol>
          </div>
        ) : (
          <>
            <HomeTips storageKey={PERIODIC_HOME_TIPS_KEY}>
              點擊右上「＋」新增計畫或資料夾；可拖曳計畫到資料夾整理。
            </HomeTips>
            <div className="content-stack">
              {folders.length > 0 ? (
                <section
                  className={`folder-block ${isFolderOpen('__folders__') ? '' : 'is-collapsed'}`}
                >
                  <header className="folder-header">
                    <button
                      type="button"
                      className="panel-toggle"
                      aria-expanded={isFolderOpen('__folders__')}
                      onClick={() => toggleFolder('__folders__')}
                      title={isFolderOpen('__folders__') ? '收起' : '展開'}
                    >
                      <span aria-hidden="true">{isFolderOpen('__folders__') ? '−' : '＋'}</span>
                    </button>
                    <div className="folder-title">
                      <h2>資料夾</h2>
                      <p className="folder-hint">按住左側 ⋮⋮ 可拖動排序</p>
                    </div>
                    <span className="folder-count">{folders.length} 個資料夾</span>
                  </header>
                  {isFolderOpen('__folders__') ? (
                    <div className="folder-body folder-group">
                      {folders.map((folder) => {
                        const folderPlans = plansByFolder.map.get(folder.id) ?? []
                        const isDropTarget = !draggingFolderId && dropTargetId === folder.id
                        const isReorderTarget = folderDropTargetId === folder.id
                        const open = isFolderOpen(folder.id)
                        const contentId = `periodic-folder-body-${folder.id}`

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
                                onDragEnd={() => {
                                  setDraggingFolderId(null)
                                  setFolderDropTargetId(null)
                                }}
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
                              </button>
                              <div className="folder-title">
                                <h3>{folder.name}</h3>
                                {folder.note ? <p className="entity-note">{folder.note}</p> : null}
                              </div>
                              <div className="folder-header-actions">
                                <span className="folder-count">{folderPlans.length} 個計畫</span>
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
                                  {folderMenuId === folder.id ? (
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
                                                `確定刪除資料夾「${folder.name}」？內含計畫會移到未分類。`,
                                              )
                                            ) {
                                              onDeleteFolders([folder.id])
                                            }
                                          }}
                                        >
                                          <span>
                                            <strong>刪除資料夾</strong>
                                          </span>
                                        </button>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </header>
                            {open && folderPlans.length > 0 ? (
                              <div id={contentId} className="folder-body">
                                <ul className="project-list">{folderPlans.map(renderPlanCard)}</ul>
                              </div>
                            ) : null}
                          </section>
                        )
                      })}
                    </div>
                  ) : null}
                </section>
              ) : null}

              {(plansByFolder.uncategorized.length > 0 || folders.length > 0) && (
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
                          onClick={() => toggleFolder('uncategorized')}
                          title={isFolderOpen('uncategorized') ? '收起' : '展開'}
                        >
                          <span aria-hidden="true">
                            {isFolderOpen('uncategorized') ? '−' : '＋'}
                          </span>
                        </button>
                        <div className="folder-title">
                          <h2>一般計畫</h2>
                        </div>
                        <span className="folder-count">
                          {plansByFolder.uncategorized.length} 個計畫
                        </span>
                      </header>
                      {isFolderOpen('uncategorized') ? (
                        <div className="folder-body">
                          {plansByFolder.uncategorized.length === 0 ? (
                            <p className="folder-empty">拖曳計畫到這裡可移出資料夾</p>
                          ) : (
                            <ul className="project-list">
                              {plansByFolder.uncategorized.map(renderPlanCard)}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="folder-body">
                      <ul className="project-list">
                        {plansByFolder.uncategorized.map(renderPlanCard)}
                      </ul>
                    </div>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </section>

      <CreatePeriodicPlanModal
        open={createOpen}
        folders={folders}
        onClose={() => setCreateOpen(false)}
        onSubmit={onCreatePlan}
      />
      <CreateFolderModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSubmit={onCreateFolder}
      />
      <RenameModal
        open={Boolean(renameTarget)}
        title="更改資料夾名稱"
        fieldLabel="資料夾名稱"
        initialName={renameTarget?.name ?? ''}
        onClose={() => setRenameTarget(null)}
        onSave={(name) => {
          if (!renameTarget) return
          onUpdateFolderName(renameTarget.id, name)
        }}
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
          onUpdateFolderNote(noteTarget.id, note)
        }}
      />
      <UsageGuide
        open={usageGuideOpen}
        variant="periodic"
        onClose={() => {
          markPeriodicUsageGuideSeen()
          setUsageGuideOpen(false)
        }}
        onStartCreate={() => setCreateOpen(true)}
      />
    </div>
  )
}

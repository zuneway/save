import { useCallback, useEffect, useState } from 'react'
import type {
  AddEntryInput,
  CreateFolderInput,
  CreateProjectInput,
  DetailPanelId,
  PlannedDayDepositKind,
  PlannedDeposit,
  ProjectFolder,
  RandomDepositSettings,
  SavingsEntry,
  SavingsProject,
  UpdateRandomDepositInput,
} from '../types/savings'
import { ALL_DETAIL_PANEL_IDS, DEFAULT_DETAIL_LAYOUT } from '../types/savings'
import {
  DEFAULT_RANDOM_DEPOSIT,
  getPlannedAmount,
  getProjectDateKeys,
  getRemainingAmount,
  getTodayDateInputValue,
  regenerateFuturePlans,
} from '../utils/deadline'
import { insertByName, sortByName } from '../utils/sortByName'

const AUTO_COMPLETE_NOTE = '標記今日完成'
const RANDOM_DEPOSIT_NOTE = '系統隨機分配'
const EARLY_DEPOSIT_NOTE = '提早存入'
const MAKEUP_DEPOSIT_NOTE = '補存入'

function isAutoTodayEntry(entry: SavingsEntry, today: string) {
  return (
    entry.date === today &&
    (entry.note === AUTO_COMPLETE_NOTE || entry.note === RANDOM_DEPOSIT_NOTE)
  )
}

const STORAGE_KEY = 'savings-system:data'

interface SavingsData {
  folders: ProjectFolder[]
  projects: SavingsProject[]
}

function isLegacyProject(value: unknown): value is Omit<
  SavingsProject,
  'deadline' | 'folderId' | 'completedDates' | 'entries'
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'targetAmount' in value &&
    !('deadline' in value)
  )
}

function normalizeEntries(raw: unknown): SavingsEntry[] {
  if (!Array.isArray(raw)) return []
  const entries: SavingsEntry[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const entry = item as Partial<SavingsEntry>
    if (!entry.id || entry.amount == null || !entry.date) continue
    entries.push({
      id: entry.id,
      date: entry.date,
      amount: entry.amount,
      note: entry.note,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    })
  }
  return entries
}

function normalizePlannedDeposits(raw: unknown): PlannedDeposit[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const plan = item as Partial<PlannedDeposit>
      if (!plan.date || plan.amount == null || plan.amount <= 0) return null
      return { date: plan.date, amount: plan.amount }
    })
    .filter((item): item is PlannedDeposit => item !== null)
}

function normalizeRandomDeposit(raw: unknown): RandomDepositSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_RANDOM_DEPOSIT }
  const settings = raw as Partial<RandomDepositSettings>
  const minAmount =
    typeof settings.minAmount === 'number' && settings.minAmount > 0
      ? Math.floor(settings.minAmount)
      : DEFAULT_RANDOM_DEPOSIT.minAmount
  const maxAmount =
    typeof settings.maxAmount === 'number' && settings.maxAmount > 0
      ? Math.floor(settings.maxAmount)
      : DEFAULT_RANDOM_DEPOSIT.maxAmount

  return {
    enabled: Boolean(settings.enabled),
    minAmount: Math.min(minAmount, maxAmount),
    maxAmount: Math.max(minAmount, maxAmount),
  }
}

function normalizeDetailLayout(raw: unknown): DetailPanelId[] {
  const valid = new Set<string>(ALL_DETAIL_PANEL_IDS)
  if (!Array.isArray(raw)) return [...DEFAULT_DETAIL_LAYOUT]

  const unique: DetailPanelId[] = []
  for (const item of raw) {
    // Migrate old separate panels into the merged deposit panel.
    const mapped =
      item === 'randomDeposit' || item === 'manualEntry' ? 'deposit' : item

    if (
      typeof mapped === 'string' &&
      valid.has(mapped) &&
      !unique.includes(mapped as DetailPanelId)
    ) {
      unique.push(mapped as DetailPanelId)
    }
  }
  return unique.length > 0 ? unique : [...DEFAULT_DETAIL_LAYOUT]
}

function normalizeProject(raw: unknown): SavingsProject | null {
  if (typeof raw !== 'object' || raw === null) return null

  if (isLegacyProject(raw)) {
    return {
      ...raw,
      deadline: { type: 'days', days: 30 },
      folderId: null,
      completedDates: [],
      entries: [],
      randomDeposit: { ...DEFAULT_RANDOM_DEPOSIT },
      plannedDeposits: [],
      detailLayout: [...DEFAULT_DETAIL_LAYOUT],
    }
  }

  const project = raw as Partial<SavingsProject>
  if (!project.id || !project.name || !project.deadline || project.targetAmount == null) {
    return null
  }

  const entries = normalizeEntries(project.entries)
  const completedDates = Array.isArray(project.completedDates)
    ? project.completedDates.filter((date): date is string => typeof date === 'string')
    : []

  const randomDeposit = normalizeRandomDeposit(project.randomDeposit)
  let detailLayout = normalizeDetailLayout(project.detailLayout)
  if (randomDeposit.enabled) {
    detailLayout = detailLayout.filter((id) => id !== 'deposit')
    if (detailLayout.length === 0) detailLayout = [...DEFAULT_DETAIL_LAYOUT].filter((id) => id !== 'deposit')
  }

  return {
    id: project.id,
    name: project.name,
    targetAmount: project.targetAmount,
    currentAmount: project.currentAmount ?? entries.reduce((sum, entry) => sum + entry.amount, 0),
    createdAt: project.createdAt ?? new Date().toISOString(),
    deadline: project.deadline,
    folderId: project.folderId ?? null,
    completedDates,
    entries,
    randomDeposit,
    plannedDeposits: normalizePlannedDeposits(project.plannedDeposits),
    detailLayout,
  }
}

function normalizeFolder(raw: unknown): ProjectFolder | null {
  if (typeof raw !== 'object' || raw === null) return null
  const folder = raw as Partial<ProjectFolder>
  if (!folder.id || !folder.name) return null
  return {
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt ?? new Date().toISOString(),
  }
}

function loadData(): SavingsData {
  try {
    const nextGen = localStorage.getItem(STORAGE_KEY)
    if (nextGen) {
      const parsed = JSON.parse(nextGen) as Partial<SavingsData>
      return {
        folders: Array.isArray(parsed.folders)
          ? parsed.folders.map(normalizeFolder).filter((f): f is ProjectFolder => f !== null)
          : [],
        projects: Array.isArray(parsed.projects)
          ? parsed.projects.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
          : [],
      }
    }

    const legacy = localStorage.getItem('savings-system:projects')
    if (!legacy) return { folders: [], projects: [] }

    const parsed = JSON.parse(legacy) as unknown[]
    const projects = Array.isArray(parsed)
      ? parsed.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
      : []

    return { folders: [], projects }
  } catch {
    return { folders: [], projects: [] }
  }
}

function saveData(data: SavingsData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function updateProject(
  prev: SavingsData,
  projectId: string,
  updater: (project: SavingsProject) => SavingsProject,
): SavingsData {
  return {
    ...prev,
    projects: prev.projects.map((project) =>
      project.id === projectId ? updater(project) : project,
    ),
  }
}

export function useSavingsProjects() {
  const [data, setData] = useState<SavingsData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const createProject = useCallback((input: CreateProjectInput) => {
    const project: SavingsProject = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      targetAmount: input.targetAmount,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      deadline: input.deadline,
      folderId: input.folderId ?? null,
      completedDates: [],
      entries: [],
      randomDeposit: { ...DEFAULT_RANDOM_DEPOSIT },
      plannedDeposits: [],
      detailLayout: [...DEFAULT_DETAIL_LAYOUT],
    }
    setData((prev) => ({
      ...prev,
      projects: sortByName([project, ...prev.projects]),
    }))
    return project
  }, [])

  const createFolder = useCallback((input: CreateFolderInput) => {
    const folder: ProjectFolder = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      createdAt: new Date().toISOString(),
    }
    setData((prev) => ({
      ...prev,
      folders: insertByName(prev.folders, folder),
    }))
    return folder
  }, [])

  const deleteProjects = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setData((prev) => ({
      ...prev,
      projects: prev.projects.filter((project) => !idSet.has(project.id)),
    }))
  }, [])

  const deleteFolders = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setData((prev) => ({
      folders: prev.folders.filter((folder) => !idSet.has(folder.id)),
      projects: prev.projects.map((project) =>
        project.folderId && idSet.has(project.folderId)
          ? { ...project, folderId: null }
          : project,
      ),
    }))
  }, [])

  const moveProjectsToFolder = useCallback((ids: string[], folderId: string | null) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setData((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        idSet.has(project.id) ? { ...project, folderId } : project,
      ),
    }))
  }, [])

  const reorderFolders = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setData((prev) => {
      const from = prev.folders.findIndex((folder) => folder.id === sourceId)
      const to = prev.folders.findIndex((folder) => folder.id === targetId)
      if (from < 0 || to < 0) return prev
      const next = [...prev.folders]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return { ...prev, folders: next }
    })
  }, [])

  const toggleTodayComplete = useCallback((projectId: string) => {
    const today = getTodayDateInputValue()
    setData((prev) =>
      updateProject(prev, projectId, (project) => {
        const completed = (project.completedDates ?? []).includes(today)
        let nextProject: SavingsProject

        // Capture before undo/complete so canceling does not change today's suggested amount.
        const preservedTodayAmount = getPlannedAmount(project, today) ?? 0

        if (completed) {
          // Undo today's auto deposits so overview + detail list roll back together.
          const removedAmount = project.entries
            .filter((entry) => isAutoTodayEntry(entry, today))
            .reduce((sum, entry) => sum + entry.amount, 0)

          nextProject = {
            ...project,
            completedDates: project.completedDates.filter((date) => date !== today),
            currentAmount: Math.max(0, project.currentAmount - removedAmount),
            entries: project.entries.filter((entry) => !isAutoTodayEntry(entry, today)),
          }
        } else {
          const planned = preservedTodayAmount
          const hasTodayEntry = project.entries.some((entry) => entry.date === today)
          const entries = [...project.entries]
          let currentAmount = project.currentAmount

          // Sync overview progress + detail list when completing today.
          if (planned > 0 && !hasTodayEntry) {
            entries.unshift({
              id: crypto.randomUUID(),
              date: today,
              amount: planned,
              note: AUTO_COMPLETE_NOTE,
              createdAt: new Date().toISOString(),
            })
            currentAmount += planned
          }

          nextProject = {
            ...project,
            completedDates: [...project.completedDates, today].sort(),
            currentAmount,
            entries,
          }
        }

        if (nextProject.randomDeposit.enabled) {
          return {
            ...nextProject,
            plannedDeposits: regenerateFuturePlans(
              nextProject,
              nextProject.randomDeposit,
              // Keep today's suggested amount unchanged when canceling completion.
              completed ? { [today]: preservedTodayAmount } : undefined,
            ),
          }
        }

        return nextProject
      }),
    )
  }, [])

  const completePlannedDay = useCallback(
    (projectId: string, date: string, kind: PlannedDayDepositKind) => {
      const today = getTodayDateInputValue()
      if (kind === 'early' && date <= today) return
      if (kind === 'makeup' && date >= today) return

      setData((prev) =>
        updateProject(prev, projectId, (project) => {
          if ((project.completedDates ?? []).includes(date)) return project
          if (!getProjectDateKeys(project).includes(date)) return project

          const planned = getPlannedAmount(project, date) ?? 0
          const amount = Math.min(Math.max(0, planned), getRemainingAmount(project))
          const note = kind === 'early' ? EARLY_DEPOSIT_NOTE : MAKEUP_DEPOSIT_NOTE

          let entries = project.entries
          let currentAmount = project.currentAmount

          if (amount > 0) {
            entries = [
              {
                id: crypto.randomUUID(),
                date,
                amount,
                note,
                createdAt: new Date().toISOString(),
              },
              ...project.entries,
            ]
            currentAmount += amount
          }

          const nextProject: SavingsProject = {
            ...project,
            completedDates: [...project.completedDates, date].sort(),
            currentAmount,
            entries,
          }

          if (nextProject.randomDeposit.enabled) {
            return {
              ...nextProject,
              plannedDeposits: regenerateFuturePlans(
                nextProject,
                nextProject.randomDeposit,
              ),
            }
          }

          return nextProject
        }),
      )
    },
    [],
  )

  const addEntry = useCallback((projectId: string, input: AddEntryInput) => {
    const date = input.date ?? getTodayDateInputValue()
    const entry: SavingsEntry = {
      id: crypto.randomUUID(),
      date,
      amount: input.amount,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    setData((prev) =>
      updateProject(prev, projectId, (project) => {
        const completedDates = project.completedDates.includes(date)
          ? project.completedDates
          : [...project.completedDates, date].sort()
        const nextProject: SavingsProject = {
          ...project,
          currentAmount: project.currentAmount + input.amount,
          completedDates,
          entries: [entry, ...project.entries],
        }

        // Rebalance remaining-day plans so they still match 剩餘金額.
        if (nextProject.randomDeposit.enabled) {
          return {
            ...nextProject,
            plannedDeposits: regenerateFuturePlans(nextProject, nextProject.randomDeposit),
          }
        }

        return nextProject
      }),
    )
  }, [])

  const updateRandomDeposit = useCallback(
    (projectId: string, input: UpdateRandomDepositInput) => {
      const minAmount = Math.min(input.minAmount, input.maxAmount)
      const maxAmount = Math.max(input.minAmount, input.maxAmount)
      const settings: RandomDepositSettings = {
        enabled: input.enabled,
        minAmount,
        maxAmount,
      }

      setData((prev) =>
        updateProject(prev, projectId, (project) => {
          const shouldRegenerate =
            input.regeneratePlan ||
            settings.enabled ||
            project.plannedDeposits.length === 0 ||
            project.randomDeposit.minAmount !== settings.minAmount ||
            project.randomDeposit.maxAmount !== settings.maxAmount

          const nextLayout =
            settings.enabled
              ? normalizeDetailLayout(project.detailLayout.filter((id) => id !== 'deposit'))
              : project.detailLayout

          return {
            ...project,
            randomDeposit: settings,
            plannedDeposits: shouldRegenerate
              ? regenerateFuturePlans(project, settings)
              : project.plannedDeposits,
            // After enabling random allocation, auto-hide the deposit settings panel.
            detailLayout: nextLayout,
          }
        }),
      )
    },
    [],
  )

  const regenerateRandomPlan = useCallback((projectId: string) => {
    setData((prev) =>
      updateProject(prev, projectId, (project) => ({
        ...project,
        plannedDeposits: regenerateFuturePlans(project, project.randomDeposit),
      })),
    )
  }, [])

  const updateDetailLayout = useCallback((projectId: string, layout: DetailPanelId[]) => {
    setData((prev) =>
      updateProject(prev, projectId, (project) => ({
        ...project,
        detailLayout: normalizeDetailLayout(layout),
      })),
    )
  }, [])

  return {
    folders: data.folders,
    projects: sortByName(data.projects),
    createProject,
    createFolder,
    deleteProjects,
    deleteFolders,
    moveProjectsToFolder,
    reorderFolders,
    toggleTodayComplete,
    completePlannedDay,
    addEntry,
    updateRandomDeposit,
    regenerateRandomPlan,
    updateDetailLayout,
  }
}

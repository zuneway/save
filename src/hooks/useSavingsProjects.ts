import { useCallback, useEffect, useRef, useState } from 'react'
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
import {
  decryptJson,
  encryptJson,
  isEncryptedBlob,
  tryParseJsonObject,
} from '../utils/dataCrypto'
import { isFirebaseConfigured } from '../lib/firebase'
import { loadCloudMeta } from '../utils/cloudMeta'
import { fetchCloudUserDoc, saveCloudUserDoc } from '../utils/cloudSync'

const AUTO_COMPLETE_NOTE = '標記今日完成'
const RANDOM_DEPOSIT_NOTE = '系統隨機分配'
const EARLY_DEPOSIT_NOTE = '提早存入'
const MAKEUP_DEPOSIT_NOTE = '補存入'
const CLOUD_PUSH_DEBOUNCE_MS = 800

function isAutoTodayEntry(entry: SavingsEntry, today: string) {
  return (
    entry.date === today &&
    (entry.note === AUTO_COMPLETE_NOTE || entry.note === RANDOM_DEPOSIT_NOTE)
  )
}

function isEarlyDepositEntry(entry: SavingsEntry, date: string) {
  return entry.date === date && entry.note === EARLY_DEPOSIT_NOTE
}

const LEGACY_STORAGE_KEY = 'savings-system:data'

function storageKey(userId: string) {
  return `savings-system:data:${userId}`
}

interface SavingsData {
  folders: ProjectFolder[]
  projects: SavingsProject[]
  updatedAt?: number
}

function withUpdatedAt(data: SavingsData): SavingsData {
  return {
    folders: data.folders,
    projects: data.projects,
    updatedAt: Date.now(),
  }
}

function readUpdatedAt(data: SavingsData): number {
  return typeof data.updatedAt === 'number' ? data.updatedAt : 0
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
  return unique.length > 0 ? putOverviewFirst(unique) : [...DEFAULT_DETAIL_LAYOUT]
}

function putOverviewFirst(layout: DetailPanelId[]) {
  const overviewIndex = layout.indexOf('overview')
  if (overviewIndex <= 0) return layout
  const next = [...layout]
  next.splice(overviewIndex, 1)
  next.unshift('overview')
  return next
}

function normalizeProject(raw: unknown): SavingsProject | null {
  if (typeof raw !== 'object' || raw === null) return null

  if (isLegacyProject(raw)) {
    return {
      ...raw,
      note: undefined,
      deadline: { type: 'days', days: 30 },
      savingsMode: 'daily',
      intervalDays: 1,
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

  const note =
    typeof project.note === 'string' && project.note.trim() ? project.note.trim() : undefined

  const savingsMode: SavingsProject['savingsMode'] =
    project.savingsMode === 'weekly' ||
    project.savingsMode === 'monthly' ||
    project.savingsMode === 'daily' ||
    project.savingsMode === 'custom'
      ? project.savingsMode
      : 'daily'

  let intervalDays =
    typeof project.intervalDays === 'number' && project.intervalDays >= 1
      ? Math.floor(project.intervalDays)
      : savingsMode === 'weekly'
        ? 7
        : savingsMode === 'monthly'
          ? 30
          : 1

  // Old "custom" freeform projects without interval → treat as daily.
  if (project.savingsMode === 'custom' && typeof project.intervalDays !== 'number') {
    intervalDays = 1
  }

  const periodAmount =
    typeof project.periodAmount === 'number' && project.periodAmount > 0
      ? Math.floor(project.periodAmount)
      : undefined

  return {
    id: project.id,
    name: project.name,
    note,
    targetAmount: project.targetAmount,
    currentAmount: project.currentAmount ?? entries.reduce((sum, entry) => sum + entry.amount, 0),
    createdAt: project.createdAt ?? new Date().toISOString(),
    deadline: project.deadline,
    savingsMode,
    intervalDays,
    periodAmount,
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
  const note =
    typeof folder.note === 'string' && folder.note.trim() ? folder.note.trim() : undefined
  return {
    id: folder.id,
    name: folder.name,
    note,
    createdAt: folder.createdAt ?? new Date().toISOString(),
  }
}

function parseSavingsData(raw: string | null): SavingsData {
  if (!raw) return { folders: [], projects: [], updatedAt: 0 }
  try {
    const parsed = JSON.parse(raw) as Partial<SavingsData>
    return {
      folders: Array.isArray(parsed.folders)
        ? parsed.folders.map(normalizeFolder).filter((f): f is ProjectFolder => f !== null)
        : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
        : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return { folders: [], projects: [], updatedAt: 0 }
  }
}

function parsePlainSavingsRaw(raw: string): SavingsData | null {
  const object = tryParseJsonObject(raw)
  if (!object) return null
  if (isEncryptedBlob(object)) return null
  return parseSavingsData(raw)
}

async function loadData(
  userId: string,
  options: { encrypt: boolean; dataKey: CryptoKey | null },
): Promise<SavingsData> {
  try {
    const keyed = localStorage.getItem(storageKey(userId))
    if (keyed) {
      const object = tryParseJsonObject(keyed)
      if (object && isEncryptedBlob(object)) {
        if (!options.dataKey) throw new Error('需要密碼才能讀取加密資料')
        const decrypted = await decryptJson<Partial<SavingsData>>(options.dataKey, keyed)
        return {
          folders: Array.isArray(decrypted.folders)
            ? decrypted.folders.map(normalizeFolder).filter((f): f is ProjectFolder => f !== null)
            : [],
          projects: Array.isArray(decrypted.projects)
            ? decrypted.projects.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
            : [],
          updatedAt: typeof decrypted.updatedAt === 'number' ? decrypted.updatedAt : 0,
        }
      }

      const plain = parsePlainSavingsRaw(keyed)
      if (plain) return plain
    }

    // Backward compatible: old anonymous data / projects list.
    const nextGen = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (nextGen) {
      const plain = parsePlainSavingsRaw(nextGen)
      if (plain) return plain
    }

    const legacy = localStorage.getItem('savings-system:projects')
    if (!legacy) return { folders: [], projects: [], updatedAt: 0 }

    const parsed = JSON.parse(legacy) as unknown[]
    const projects = Array.isArray(parsed)
      ? parsed.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
      : []

    return { folders: [], projects, updatedAt: 0 }
  } catch (error) {
    if (options.encrypt) throw error
    return { folders: [], projects: [], updatedAt: 0 }
  }
}

async function decodePayload(
  payload: string,
  options: { encrypt: boolean; dataKey: CryptoKey | null },
): Promise<SavingsData | null> {
  const object = tryParseJsonObject(payload)
  if (object && isEncryptedBlob(object)) {
    if (!options.dataKey) return null
    try {
      const decrypted = await decryptJson<Partial<SavingsData>>(options.dataKey, payload)
      return {
        folders: Array.isArray(decrypted.folders)
          ? decrypted.folders.map(normalizeFolder).filter((f): f is ProjectFolder => f !== null)
          : [],
        projects: Array.isArray(decrypted.projects)
          ? decrypted.projects.map(normalizeProject).filter((p): p is SavingsProject => p !== null)
          : [],
        updatedAt: typeof decrypted.updatedAt === 'number' ? decrypted.updatedAt : 0,
      }
    } catch {
      return null
    }
  }
  return parsePlainSavingsRaw(payload)
}

async function saveData(
  userId: string,
  data: SavingsData,
  options: { encrypt: boolean; dataKey: CryptoKey | null },
): Promise<string | null> {
  const stamped = {
    folders: data.folders,
    projects: data.projects,
    updatedAt: readUpdatedAt(data) || Date.now(),
  }

  if (options.encrypt) {
    if (!options.dataKey) return null
    const payload = await encryptJson(options.dataKey, stamped)
    localStorage.setItem(storageKey(userId), payload)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem('savings-system:projects')
    return payload
  }

  const payload = JSON.stringify(stamped)
  localStorage.setItem(storageKey(userId), payload)
  return payload
}

async function pushPayloadToCloud(userId: string, payload: string, updatedAt: number) {
  if (!isFirebaseConfigured()) return
  const meta = loadCloudMeta(userId)
  if (!meta) return
  await saveCloudUserDoc(userId, {
    username: meta.username,
    dataSalt: meta.dataSalt,
    dataKeyIterations: meta.dataKeyIterations,
    payload,
    updatedAt,
    createdAt: meta.createdAt,
  })
}

async function pullAndMergeCloud(
  userId: string,
  local: SavingsData,
  options: { encrypt: boolean; dataKey: CryptoKey | null },
): Promise<SavingsData> {
  if (!isFirebaseConfigured() || !options.encrypt) return local

  try {
    const cloud = await fetchCloudUserDoc(userId)
    if (!cloud?.payload) return local

    const remote = await decodePayload(cloud.payload, options)
    if (!remote) return local

    const localTs = readUpdatedAt(local)
    const remoteTs = Math.max(readUpdatedAt(remote), cloud.updatedAt || 0)

    if (remoteTs > localTs) {
      localStorage.setItem(storageKey(userId), cloud.payload)
      return { ...remote, updatedAt: remoteTs }
    }

    if (localTs > remoteTs) {
      const payload = await saveData(userId, local, options)
      if (payload) await pushPayloadToCloud(userId, payload, localTs)
    }

    return local
  } catch {
    // Offline / permission: keep local.
    return local
  }
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

export function useSavingsProjects(
  userId: string,
  options: { encrypt: boolean; dataKey: CryptoKey | null },
) {
  const encrypt = options.encrypt
  const dataKey = options.dataKey
  const [data, setData] = useState<SavingsData>({ folders: [], projects: [], updatedAt: 0 })
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle')

  useEffect(() => {
    let cancelled = false
    setStorageReady(false)
    setStorageError(null)

    void (async () => {
      try {
        const loaded = await loadData(userId, { encrypt, dataKey })
        if (cancelled) return
        const merged = await pullAndMergeCloud(userId, loaded, { encrypt, dataKey })
        if (cancelled) return
        setData(merged)
        setStorageReady(true)
        setSyncState(encrypt && isFirebaseConfigured() ? 'synced' : 'idle')
      } catch (error) {
        if (cancelled) return
        setData({ folders: [], projects: [], updatedAt: 0 })
        setStorageError(error instanceof Error ? error.message : '無法讀取加密資料')
        setStorageReady(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [userId, encrypt, dataKey])

  const dataRef = useRef(data)
  dataRef.current = data

  // Keep registered accounts fresh across devices while the app stays open.
  useEffect(() => {
    if (!storageReady || !encrypt || !dataKey || !isFirebaseConfigured()) return

    let cancelled = false
    const pull = () => {
      void (async () => {
        const current = dataRef.current
        try {
          const merged = await pullAndMergeCloud(userId, current, { encrypt, dataKey })
          if (cancelled) return
          if (readUpdatedAt(merged) > readUpdatedAt(current)) {
            setData(merged)
            setSyncState('synced')
          }
        } catch {
          if (!cancelled) setSyncState('offline')
        }
      })()
    }

    const timer = window.setInterval(pull, 20_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', pull)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', pull)
    }
  }, [storageReady, encrypt, dataKey, userId])

  useEffect(() => {
    if (!storageReady) return
    if (encrypt && !dataKey) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        const payload = await saveData(userId, data, { encrypt, dataKey })
        if (cancelled || !payload || !encrypt || !isFirebaseConfigured()) return

        setSyncState('syncing')
        try {
          await pushPayloadToCloud(userId, payload, readUpdatedAt(data) || Date.now())
          if (!cancelled) setSyncState('synced')
        } catch {
          if (!cancelled) setSyncState('offline')
        }
      })()
    }, encrypt && isFirebaseConfigured() ? CLOUD_PUSH_DEBOUNCE_MS : 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [userId, data, encrypt, dataKey, storageReady])

  const setDataStamped = useCallback((updater: (prev: SavingsData) => SavingsData) => {
    setData((prev) => withUpdatedAt(updater(prev)))
  }, [])

  const createProject = useCallback((input: CreateProjectInput) => {
    const note = input.note?.trim() || undefined
    const savingsMode = input.savingsMode ?? 'daily'
    const intervalDays =
      typeof input.intervalDays === 'number' && input.intervalDays >= 1
        ? Math.floor(input.intervalDays)
        : savingsMode === 'weekly'
          ? 7
          : savingsMode === 'monthly'
            ? 30
            : 1
    const project: SavingsProject = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      note,
      targetAmount: input.targetAmount,
      currentAmount: 0,
      createdAt: new Date().toISOString(),
      deadline: input.deadline,
      savingsMode,
      intervalDays,
      periodAmount:
        typeof input.periodAmount === 'number' && input.periodAmount > 0
          ? Math.floor(input.periodAmount)
          : undefined,
      folderId: input.folderId ?? null,
      completedDates: [],
      entries: [],
      randomDeposit: { ...DEFAULT_RANDOM_DEPOSIT },
      plannedDeposits: [],
      detailLayout: [...DEFAULT_DETAIL_LAYOUT],
    }
    setDataStamped((prev) => ({
      ...prev,
      projects: sortByName([project, ...prev.projects]),
    }))
    return project
  }, [])

  const createFolder = useCallback((input: CreateFolderInput) => {
    const note = input.note?.trim() || undefined
    const folder: ProjectFolder = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      note,
      createdAt: new Date().toISOString(),
    }
    setDataStamped((prev) => ({
      ...prev,
      folders: insertByName(prev.folders, folder),
    }))
    return folder
  }, [])

  const updateProjectNote = useCallback((projectId: string, note: string) => {
    const nextNote = note.trim() || undefined
    setDataStamped((prev) =>
      updateProject(prev, projectId, (project) => ({
        ...project,
        note: nextNote,
      })),
    )
  }, [])

  const updateProjectName = useCallback((projectId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setDataStamped((prev) => {
      const updated = updateProject(prev, projectId, (project) => ({
        ...project,
        name: nextName,
      }))
      return {
        ...updated,
        projects: sortByName(updated.projects),
      }
    })
  }, [])

  const updateFolderNote = useCallback((folderId: string, note: string) => {
    const nextNote = note.trim() || undefined
    setDataStamped((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.id === folderId ? { ...folder, note: nextNote } : folder,
      ),
    }))
  }, [])

  const updateFolderName = useCallback((folderId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    setDataStamped((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: nextName } : folder,
      ),
    }))
  }, [])

  const deleteProjects = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setDataStamped((prev) => ({
      ...prev,
      projects: prev.projects.filter((project) => !idSet.has(project.id)),
    }))
  }, [])

  const deleteFolders = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setDataStamped((prev) => ({
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
    setDataStamped((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        idSet.has(project.id) ? { ...project, folderId } : project,
      ),
    }))
  }, [])

  const reorderFolders = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setDataStamped((prev) => {
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
    setDataStamped((prev) =>
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

      setDataStamped((prev) =>
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

  const undoEarlyDeposit = useCallback((projectId: string, date: string) => {
    const today = getTodayDateInputValue()
    if (date <= today) return

    setDataStamped((prev) =>
      updateProject(prev, projectId, (project) => {
        if (!(project.completedDates ?? []).includes(date)) return project
        if (!getProjectDateKeys(project).includes(date)) return project

        const earlyEntries = project.entries.filter((entry) => isEarlyDepositEntry(entry, date))
        if (earlyEntries.length === 0) return project

        const removedAmount = earlyEntries.reduce((sum, entry) => sum + entry.amount, 0)
        const preservedAmount = getPlannedAmount(project, date) ?? removedAmount

        const nextProject: SavingsProject = {
          ...project,
          completedDates: project.completedDates.filter((item) => item !== date),
          currentAmount: Math.max(0, project.currentAmount - removedAmount),
          entries: project.entries.filter((entry) => !isEarlyDepositEntry(entry, date)),
        }

        if (nextProject.randomDeposit.enabled) {
          return {
            ...nextProject,
            plannedDeposits: regenerateFuturePlans(nextProject, nextProject.randomDeposit, {
              [date]: preservedAmount,
            }),
          }
        }

        return nextProject
      }),
    )
  }, [])

  const addEntry = useCallback((projectId: string, input: AddEntryInput) => {
    const date = input.date ?? getTodayDateInputValue()
    const entry: SavingsEntry = {
      id: crypto.randomUUID(),
      date,
      amount: input.amount,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    setDataStamped((prev) =>
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

      setDataStamped((prev) =>
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
    setDataStamped((prev) =>
      updateProject(prev, projectId, (project) => ({
        ...project,
        plannedDeposits: regenerateFuturePlans(project, project.randomDeposit),
      })),
    )
  }, [])

  const updateDetailLayout = useCallback((projectId: string, layout: DetailPanelId[]) => {
    setDataStamped((prev) =>
      updateProject(prev, projectId, (project) => ({
        ...project,
        detailLayout: normalizeDetailLayout(layout),
      })),
    )
  }, [])

  return {
    storageReady,
    storageError,
    syncState,
    folders: data.folders,
    projects: sortByName(data.projects),
    createProject,
    createFolder,
    updateProjectNote,
    updateProjectName,
    updateFolderNote,
    updateFolderName,
    deleteProjects,
    deleteFolders,
    moveProjectsToFolder,
    reorderFolders,
    toggleTodayComplete,
    completePlannedDay,
    undoEarlyDeposit,
    addEntry,
    updateRandomDeposit,
    regenerateRandomPlan,
    updateDetailLayout,
  }
}

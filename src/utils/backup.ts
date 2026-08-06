const BACKUP_VERSION = 1
const PREFIX = 'savings-system:'

export interface SavingsBackup {
  version: number
  exportedAt: string
  entries: Record<string, string>
}

const SKIP_KEYS = new Set([
  'savings-system:session',
])

export function collectLocalBackup(): SavingsBackup {
  const entries: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !key.startsWith(PREFIX) || SKIP_KEYS.has(key)) continue
    const value = localStorage.getItem(key)
    if (value != null) entries[key] = value
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  }
}

export function downloadBackup(filename = `savings-backup-${formatStamp()}.json`) {
  const backup = collectLocalBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
  return backup
}

function formatStamp() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

export function parseBackupJson(raw: string): SavingsBackup {
  const parsed = JSON.parse(raw) as Partial<SavingsBackup>
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.entries !== 'object' ||
    parsed.entries === null ||
    Array.isArray(parsed.entries)
  ) {
    throw new Error('備份檔格式不正確')
  }

  const entries: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed.entries)) {
    if (!key.startsWith(PREFIX) || SKIP_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    entries[key] = value
  }

  if (Object.keys(entries).length === 0) {
    throw new Error('備份檔沒有可匯入的資料')
  }

  return {
    version: typeof parsed.version === 'number' ? parsed.version : BACKUP_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    entries,
  }
}

/** Merge backup into localStorage. Existing keys are overwritten by backup values. */
export function importLocalBackup(backup: SavingsBackup) {
  for (const [key, value] of Object.entries(backup.entries)) {
    localStorage.setItem(key, value)
  }
  // Force re-login after import so crypto keys match imported users.
  localStorage.removeItem('savings-system:session')
  try {
    sessionStorage.removeItem('savings-system:data-key')
  } catch {
    // ignore
  }
}

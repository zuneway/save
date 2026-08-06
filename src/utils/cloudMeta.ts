import { PBKDF2_ITERATIONS } from './authCrypto'

const CLOUD_META_KEY = 'savings-system:cloud-meta'

export interface CloudMeta {
  uid: string
  username: string
  dataSalt: string
  dataKeyIterations: number
  createdAt: string
}

export function loadCloudMeta(uid: string): CloudMeta | null {
  try {
    const raw = localStorage.getItem(`${CLOUD_META_KEY}:${uid}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CloudMeta>
    if (!parsed.uid || !parsed.username || !parsed.dataSalt) return null
    return {
      uid: parsed.uid,
      username: parsed.username,
      dataSalt: parsed.dataSalt,
      dataKeyIterations:
        typeof parsed.dataKeyIterations === 'number' && parsed.dataKeyIterations > 0
          ? parsed.dataKeyIterations
          : PBKDF2_ITERATIONS,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveCloudMeta(meta: CloudMeta) {
  localStorage.setItem(`${CLOUD_META_KEY}:${meta.uid}`, JSON.stringify(meta))
}

export function clearCloudMeta(uid: string) {
  localStorage.removeItem(`${CLOUD_META_KEY}:${uid}`)
}

/**
 * App release version (semver: MAJOR.MINOR.PATCH)
 *
 * - MAJOR: 一次增加多項功能 → 更新時會彈出功能說明
 * - MINOR: 增加單項功能 → 更新時會彈出功能說明
 * - PATCH: 既有功能修正／小改 → 僅提示重新整理，不顯示功能清單
 *
 * Bump APP_VERSION, APP_RELEASE_NOTES, and public/version.json together.
 */
export const APP_VERSION = '1.1.0'

export const APP_VERSION_LABEL = `v${APP_VERSION}`

/** Feature notes for the current MAJOR/MINOR release (shown after update). */
export const APP_RELEASE_NOTES: string[] = [
  '大版本與中版本更新時，會彈出視窗說明本次新增的功能',
]

export type VersionBumpType = 'major' | 'minor' | 'patch' | 'none' | 'unknown'

export function parseAppVersion(version: string): [number, number, number] | null {
  const match = String(version)
    .trim()
    .replace(/^v/i, '')
    .match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** True when remote is a newer semver than local. Legacy single-number versions count as older. */
export function isNewerAppVersion(remote: string, local: string): boolean {
  const remoteParts = parseAppVersion(remote)
  const localParts = parseAppVersion(local)

  if (remoteParts && localParts) {
    for (let index = 0; index < 3; index += 1) {
      if (remoteParts[index] > localParts[index]) return true
      if (remoteParts[index] < localParts[index]) return false
    }
    return false
  }

  // Legacy labels like "3" / "4" → always treat modern semver remote as newer.
  if (remoteParts && !localParts) return true
  if (!remoteParts && localParts) return false
  return String(remote).trim() !== String(local).trim()
}

/** How `to` differs from `from` when `to` is newer. */
export function getVersionBumpType(from: string, to: string): VersionBumpType {
  if (!isNewerAppVersion(to, from)) return 'none'

  const fromParts = parseAppVersion(from)
  const toParts = parseAppVersion(to)
  if (!toParts) return 'unknown'
  // Legacy → semver: treat as major so release notes can show.
  if (!fromParts) return 'major'

  if (toParts[0] > fromParts[0]) return 'major'
  if (toParts[1] > fromParts[1]) return 'minor'
  if (toParts[2] > fromParts[2]) return 'patch'
  return 'none'
}

export function shouldShowReleaseNotes(from: string, to: string): boolean {
  const bump = getVersionBumpType(from, to)
  return bump === 'major' || bump === 'minor'
}

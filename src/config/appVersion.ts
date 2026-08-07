/**
 * App release version (semver: MAJOR.MINOR.PATCH)
 *
 * - MAJOR: 一次增加多項功能
 * - MINOR: 增加單項功能
 * - PATCH: 既有功能修正／小改
 *
 * Bump this and public/version.json together on every release users should refresh for.
 */
export const APP_VERSION = '1.0.0'

export const APP_VERSION_LABEL = `v${APP_VERSION}`

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

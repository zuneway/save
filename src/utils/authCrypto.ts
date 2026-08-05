export const PBKDF2_ITERATIONS = 310_000
/** Legacy accounts created before the privacy upgrade. */
export const LEGACY_PBKDF2_ITERATIONS = 120_000
export const PASSWORD_MIN_LENGTH = 8

function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes.buffer
}

export function createSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bufferToHex(bytes.buffer)
}

async function importPasswordKey(password: string) {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ])
}

export async function hashPassword(
  password: string,
  saltHex: string,
  iterations: number = PBKDF2_ITERATIONS,
) {
  const keyMaterial = await importPasswordKey(password)
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(saltHex),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  )
  return bufferToHex(derived)
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string,
  iterations: number = PBKDF2_ITERATIONS,
) {
  const actual = await hashPassword(password, saltHex, iterations)
  if (actual.length !== expectedHash.length) return false
  let mismatch = 0
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index)
  }
  return mismatch === 0
}

/** AES-GCM key for encrypting savings data (extractable for tab-session restore). */
export async function deriveDataKey(
  password: string,
  dataSaltHex: string,
  iterations: number = PBKDF2_ITERATIONS,
) {
  const keyMaterial = await importPasswordKey(password)
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(dataSaltHex),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function exportDataKeyRaw(key: CryptoKey) {
  return bufferToHex(await crypto.subtle.exportKey('raw', key))
}

export async function importDataKeyRaw(rawHex: string) {
  return crypto.subtle.importKey('raw', hexToBuffer(rawHex), { name: 'AES-GCM' }, true, [
    'encrypt',
    'decrypt',
  ])
}

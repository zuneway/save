export interface EncryptedBlob {
  enc: 1
  iv: string
  ciphertext: string
}

function bufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  if (typeof value !== 'object' || value === null) return false
  const blob = value as Partial<EncryptedBlob>
  return blob.enc === 1 && typeof blob.iv === 'string' && typeof blob.ciphertext === 'string'
}

export async function encryptJson(dataKey: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, encoded)
  const blob: EncryptedBlob = {
    enc: 1,
    iv: bufferToHex(iv.buffer),
    ciphertext: bufferToHex(ciphertext),
  }
  return JSON.stringify(blob)
}

export async function decryptJson<T>(dataKey: CryptoKey, raw: string): Promise<T> {
  const parsed = JSON.parse(raw) as unknown
  if (!isEncryptedBlob(parsed)) {
    throw new Error('資料格式不是加密封包')
  }
  const iv = hexToBytes(parsed.iv)
  const ciphertext = hexToBytes(parsed.ciphertext)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dataKey, ciphertext)
  return JSON.parse(new TextDecoder().decode(decrypted)) as T
}

export function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { getFirebaseDb } from '../lib/firebase'
import { normalizeUsername } from './cloudAccount'

export interface CloudSavingsDoc {
  username: string
  /** Stable login account name; optional for legacy docs */
  loginUsername?: string
  /** Real email for password reset; optional. `null` clears on save. */
  recoveryEmail?: string | null
  dataSalt: string
  dataKeyIterations: number
  /** AES-GCM ciphertext JSON string, or legacy plain JSON */
  payload: string
  updatedAt: number
  createdAt: string
}

export interface UsernameIndexDoc {
  uid: string
  email: string
}

function userDocRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid)
}

function usernameIndexRef(loginUsername: string) {
  const key = normalizeUsername(loginUsername).toLowerCase()
  return doc(getFirebaseDb(), 'usernames', key)
}

export async function fetchCloudUserDoc(uid: string): Promise<CloudSavingsDoc | null> {
  const snap = await getDoc(userDocRef(uid))
  if (!snap.exists()) return null
  const raw = snap.data() as Partial<CloudSavingsDoc>
  if (!raw.username || !raw.dataSalt || !raw.payload) return null
  return {
    username: String(raw.username),
    loginUsername:
      typeof raw.loginUsername === 'string' && raw.loginUsername.trim()
        ? String(raw.loginUsername)
        : undefined,
    recoveryEmail:
      typeof raw.recoveryEmail === 'string' && raw.recoveryEmail.trim()
        ? String(raw.recoveryEmail).trim().toLowerCase()
        : undefined,
    dataSalt: String(raw.dataSalt),
    dataKeyIterations:
      typeof raw.dataKeyIterations === 'number' && raw.dataKeyIterations > 0
        ? raw.dataKeyIterations
        : 210_000,
    payload: String(raw.payload),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

export async function saveCloudUserDoc(uid: string, data: CloudSavingsDoc): Promise<void> {
  await setDoc(
    userDocRef(uid),
    {
      username: data.username,
      ...(data.loginUsername ? { loginUsername: data.loginUsername } : {}),
      ...(data.recoveryEmail !== undefined
        ? { recoveryEmail: data.recoveryEmail || null }
        : {}),
      dataSalt: data.dataSalt,
      dataKeyIterations: data.dataKeyIterations,
      payload: data.payload,
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
    },
    { merge: true },
  )
}

export async function deleteCloudUserDoc(uid: string): Promise<void> {
  await deleteDoc(userDocRef(uid))
}

export async function fetchUsernameIndex(
  loginUsername: string,
): Promise<UsernameIndexDoc | null> {
  const snap = await getDoc(usernameIndexRef(loginUsername))
  if (!snap.exists()) return null
  const raw = snap.data() as Partial<UsernameIndexDoc>
  if (!raw.uid || !raw.email) return null
  return {
    uid: String(raw.uid),
    email: String(raw.email).trim().toLowerCase(),
  }
}

export async function saveUsernameIndex(
  loginUsername: string,
  data: UsernameIndexDoc,
): Promise<void> {
  await setDoc(usernameIndexRef(loginUsername), {
    uid: data.uid,
    email: data.email.trim().toLowerCase(),
  })
}

export async function deleteUsernameIndex(loginUsername: string): Promise<void> {
  await deleteDoc(usernameIndexRef(loginUsername))
}

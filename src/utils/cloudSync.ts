import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { getFirebaseDb } from '../lib/firebase'

export interface CloudSavingsDoc {
  username: string
  dataSalt: string
  dataKeyIterations: number
  /** AES-GCM ciphertext JSON string, or legacy plain JSON */
  payload: string
  updatedAt: number
  createdAt: string
}

function userDocRef(uid: string) {
  return doc(getFirebaseDb(), 'users', uid)
}

export async function fetchCloudUserDoc(uid: string): Promise<CloudSavingsDoc | null> {
  const snap = await getDoc(userDocRef(uid))
  if (!snap.exists()) return null
  const raw = snap.data() as Partial<CloudSavingsDoc>
  if (!raw.username || !raw.dataSalt || !raw.payload) return null
  return {
    username: String(raw.username),
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

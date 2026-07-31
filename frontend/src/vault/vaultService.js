import { db } from '../db/db.js'

const VAULT_META_ID = 'vault'
const DEFAULT_AUTO_LOCK_MINUTES = 15
const KDF_ITERATIONS = 250000
const KDF_ALGORITHM = 'PBKDF2-HMAC-SHA-256'
const CRYPTO_VERSION = 1

let activeSession = null

function normalizeBuffer(value) {
  if (!value) return null
  if (value instanceof ArrayBuffer) return value
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
  }
  return null
}

function asUint8Array(value) {
  const buffer = normalizeBuffer(value)
  if (!buffer) return new Uint8Array()
  return new Uint8Array(buffer)
}

function toArrayBuffer(value) {
  return normalizeBuffer(value) || new ArrayBuffer(0)
}

function toHex(bytes) {
  return Array.from(asUint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  if (!base64 || typeof base64 !== 'string') return new ArrayBuffer(0)
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  } catch (error) {
    console.error('Failed to decode base64 file bytes:', error)
    return new ArrayBuffer(0)
  }
}

export function getActiveVaultSession() {
  return activeSession
}

export function setActiveVaultSession(session) {
  activeSession = session
}

export function clearActiveVaultSession() {
  activeSession = null
}

export async function deriveKeyFromPassword(password, salt) {
  const saltBuffer = toArrayBuffer(salt)
  const passwordKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations: KDF_ITERATIONS
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export function createRandomSalt() {
  return crypto.getRandomValues(new Uint8Array(16)).buffer
}

export function createRandomIv() {
  return crypto.getRandomValues(new Uint8Array(12)).buffer
}

export async function encryptBytes(bytes, key, iv = createRandomIv()) {
  let buffer
  if (typeof bytes === 'string') {
    buffer = new TextEncoder().encode(bytes).buffer
  } else if (bytes instanceof ArrayBuffer) {
    buffer = bytes
  } else if (ArrayBuffer.isView(bytes)) {
    buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  } else if (bytes instanceof Blob) {
    buffer = await bytes.arrayBuffer()
  } else {
    buffer = new TextEncoder().encode(String(bytes)).buffer
  }

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, buffer)
  return {
    iv: toArrayBuffer(iv),
    ciphertext: encrypted
  }
}

export async function decryptBytes(envelope, key) {
  if (!envelope?.ciphertext) {
    throw new Error('Missing ciphertext')
  }

  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(envelope.iv) },
    key,
    toArrayBuffer(envelope.ciphertext)
  )
}

export async function encryptJson(value, key, iv = createRandomIv()) {
  const payload = JSON.stringify(value)
  return encryptBytes(payload, key, iv)
}

export async function decryptJson(envelope, key) {
  const bytes = await decryptBytes(envelope, key)
  return JSON.parse(new TextDecoder().decode(bytes))
}

export async function createVault(password, options = {}) {
  const autoLockMinutes = options.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES
  const salt = createRandomSalt()
  const key = await deriveKeyFromPassword(password, salt)
  const verifier = crypto.getRandomValues(new Uint8Array(32))
  const verifierIv = createRandomIv()
  const verifierEnvelope = await encryptBytes(verifier, key, verifierIv)

  const meta = {
    id: VAULT_META_ID,
    cryptoVersion: CRYPTO_VERSION,
    kdfAlgorithm: KDF_ALGORITHM,
    kdfIterations: KDF_ITERATIONS,
    kdfSalt: toArrayBuffer(salt),
    verifierIv: verifierEnvelope.iv,
    verifierCiphertext: verifierEnvelope.ciphertext,
    migrationState: {
      status: 'pending',
      startedAt: null,
      completedAt: null,
      lastProcessedId: null
    },
    autoLockMinutes
  }

  await db.vaultMeta.put(meta)

  return { key, meta }
}

export async function unlockVault(password) {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  if (!meta) {
    return { ok: false, reason: 'missing-vault' }
  }

  const key = await deriveKeyFromPassword(password, meta.kdfSalt)
  try {
    await decryptBytes({ iv: meta.verifierIv, ciphertext: meta.verifierCiphertext }, key)
  } catch (error) {
    return { ok: false, reason: 'invalid-password' }
  }

  const session = {
    key,
    meta,
    autoLockMinutes: meta.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES
  }
  setActiveVaultSession(session)
  await ensureMigration(key)
  return { ok: true, session }
}

export async function initializeOrUnlockVault(password, options = {}) {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  if (!meta) {
    const created = await createVault(password, options)
    const session = {
      key: created.key,
      meta: created.meta,
      autoLockMinutes: created.meta.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES
    }
    setActiveVaultSession(session)
    await ensureMigration(created.key)
    return { ok: true, created: true, session }
  }

  return unlockVault(password)
}

export async function lockVault() {
  clearActiveVaultSession()
}

export async function updateAutoLockPreference(minutes) {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  if (!meta) return null
  const nextMeta = { ...meta, autoLockMinutes: minutes }
  await db.vaultMeta.put(nextMeta)
  if (activeSession) {
    activeSession.autoLockMinutes = minutes
  }
  return nextMeta
}

export async function getAutoLockPreference() {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  return meta?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES
}

export function getVaultMeta() {
  return db.vaultMeta.get(VAULT_META_ID)
}

async function getEncryptedStore(type) {
  switch (type) {
    case 'password': return db.encryptedPasswords
    case 'note': return db.encryptedNotes
    case 'file': return db.encryptedFiles
    default: throw new Error(`Unsupported type: ${type}`)
  }
}

function getLegacyStore(type) {
  switch (type) {
    case 'password': return db.passwords
    case 'note': return db.notes
    case 'file': return db.files
    default: throw new Error(`Unsupported type: ${type}`)
  }
}

function buildPlainItem(record, type) {
  if (!record) return null
  return {
    ...record,
    type
  }
}

export async function loadVaultItems(key) {
  if (!key) return []

  const [passwords, notes, files] = await Promise.all([
    db.encryptedPasswords.toArray(),
    db.encryptedNotes.toArray(),
    db.encryptedFiles.toArray()
  ])

  const decryptEntries = async (entries, type) => {
    const decrypted = []
    for (const entry of entries) {
      try {
        const payload = await decryptJson({ iv: entry.iv, ciphertext: entry.ciphertext }, key)
        const item = buildPlainItem(payload, type)
        if (item) {
          if (type === 'file') {
            let decodedBytes = new ArrayBuffer(0)
            if (payload.fileBytes) {
              if (typeof payload.fileBytes === 'string') {
                // Base64-encoded file bytes from current format
                decodedBytes = base64ToArrayBuffer(payload.fileBytes)
              } else if (payload.fileBytes instanceof ArrayBuffer || ArrayBuffer.isView(payload.fileBytes)) {
                // Direct ArrayBuffer/Uint8Array (shouldn't happen from JSON, but handle it)
                decodedBytes = toArrayBuffer(payload.fileBytes)
              }
            } else {
              // Legacy record with missing fileBytes - lost during old JSON serialization
              console.warn(`File record ${entry.id} has no file bytes (legacy or corrupted). File will be empty.`)
            }
            item.blob = new Blob([decodedBytes], { type: payload.mimeType || 'application/octet-stream' })
          }
          decrypted.push(item)
        }
      } catch (error) {
        console.error(`Failed to decrypt ${type} record ${entry.id}:`, error)
      }
    }
    return decrypted
  }

  const [decryptedPasswords, decryptedNotes, decryptedFiles] = await Promise.all([
    decryptEntries(passwords, 'password'),
    decryptEntries(notes, 'note'),
    decryptEntries(files, 'file')
  ])

  return [...decryptedPasswords, ...decryptedNotes, ...decryptedFiles].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
}

export async function saveVaultItem(type, payload, key) {
  if (!key) throw new Error('Vault is locked')

  const store = await getEncryptedStore(type)
  const now = Date.now()
  const recordId = payload.id || crypto.randomUUID()
  const data = {
    ...payload,
    id: recordId,
    createdAt: payload.createdAt ?? now,
    updatedAt: payload.updatedAt ?? now,
    type
  }

  if (type === 'file') {
    const fileBytes = payload.fileBytes || (payload.blob instanceof Blob ? await payload.blob.arrayBuffer() : null)
    const itemPayload = {
      id: recordId,
      name: payload.name,
      mimeType: payload.type,
      size: payload.size,
      description: payload.description,
      fileBytes: fileBytes ? arrayBufferToBase64(fileBytes) : null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }
    const encrypted = await encryptJson(itemPayload, key)
    await store.put({ id: recordId, cryptoVersion: CRYPTO_VERSION, iv: encrypted.iv, ciphertext: encrypted.ciphertext })
    return { ...itemPayload, id: recordId, fileBytes: fileBytes || null, blob: payload.blob ? payload.blob : new Blob([toArrayBuffer(fileBytes)], { type: payload.type || 'application/octet-stream' }) }
  }

  const itemPayload = {
    ...payload,
    id: recordId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
  const encrypted = await encryptJson(itemPayload, key)
  await store.put({ id: recordId, cryptoVersion: CRYPTO_VERSION, iv: encrypted.iv, ciphertext: encrypted.ciphertext })
  return { ...itemPayload, id: recordId }
}

export async function updateVaultItem(type, payload, key) {
  if (!key) throw new Error('Vault is locked')
  const store = await getEncryptedStore(type)
  const existing = await store.get(payload.id)
  if (!existing) throw new Error('Missing encrypted record')

  const now = Date.now()
  const data = {
    ...payload,
    id: payload.id,
    updatedAt: now,
    createdAt: payload.createdAt ?? now
  }

  if (type === 'file') {
    const fileBytes = payload.fileBytes || (payload.blob instanceof Blob ? await payload.blob.arrayBuffer() : null)
    const itemPayload = {
      id: data.id,
      name: payload.name,
      mimeType: payload.type,
      size: payload.size,
      description: payload.description,
      fileBytes: fileBytes ? arrayBufferToBase64(fileBytes) : null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }
    const encrypted = await encryptJson(itemPayload, key)
    await store.put({ id: data.id, cryptoVersion: CRYPTO_VERSION, iv: encrypted.iv, ciphertext: encrypted.ciphertext })
    return { ...itemPayload, id: data.id, fileBytes: fileBytes || null, blob: payload.blob ? payload.blob : new Blob([toArrayBuffer(fileBytes)], { type: payload.type || 'application/octet-stream' }) }
  }

  const itemPayload = {
    ...payload,
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
  const encrypted = await encryptJson(itemPayload, key)
  await store.put({ id: data.id, cryptoVersion: CRYPTO_VERSION, iv: encrypted.iv, ciphertext: encrypted.ciphertext })
  return { ...itemPayload, id: data.id }
}

export async function deleteVaultItem(type, id) {
  const store = await getEncryptedStore(type)
  await store.delete(id)
}

export async function migrateLegacyRecords(dbRef, key, options = {}) {
  const deleteLegacyAfterSuccess = options.deleteLegacyAfterSuccess ?? false
  const meta = await dbRef.vaultMeta.get(VAULT_META_ID)
  const baselineMeta = meta || {
    id: VAULT_META_ID,
    cryptoVersion: CRYPTO_VERSION,
    kdfAlgorithm: KDF_ALGORITHM,
    kdfIterations: KDF_ITERATIONS,
    kdfSalt: new Uint8Array(16).buffer,
    verifierIv: new Uint8Array(12).buffer,
    verifierCiphertext: new Uint8Array(0).buffer,
    migrationState: {},
    autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES
  }

  const migrationState = {
    ...(baselineMeta.migrationState || {}),
    status: 'running',
    startedAt: baselineMeta.migrationState?.startedAt || Date.now(),
    lastProcessedId: baselineMeta.migrationState?.lastProcessedId || null
  }

  await dbRef.vaultMeta.put({ ...baselineMeta, migrationState })

  const allTypes = [
    { type: 'password', legacyStore: dbRef.passwords, encryptedStore: dbRef.encryptedPasswords },
    { type: 'note', legacyStore: dbRef.notes, encryptedStore: dbRef.encryptedNotes },
    { type: 'file', legacyStore: dbRef.files, encryptedStore: dbRef.encryptedFiles }
  ]

  let completed = true
  for (const entry of allTypes) {
    const legacyRecords = await entry.legacyStore.toArray()
    for (const legacyRecord of legacyRecords) {
      const existing = await entry.encryptedStore.get(legacyRecord.id)
      if (existing) {
        migrationState.lastProcessedId = legacyRecord.id
        continue
      }

      try {
        const encrypted = await encryptJson(legacyRecord, key)
        await entry.encryptedStore.put({ id: legacyRecord.id, cryptoVersion: CRYPTO_VERSION, iv: encrypted.iv, ciphertext: encrypted.ciphertext })
        migrationState.lastProcessedId = legacyRecord.id
      } catch (error) {
        completed = false
        break
      }
    }
    if (!completed) break
  }

  const updatedMeta = {
    ...baselineMeta,
    migrationState: {
      ...migrationState,
      status: completed ? 'completed' : 'failed',
      completedAt: completed ? Date.now() : null,
      lastProcessedId: migrationState.lastProcessedId
    }
  }

  await dbRef.vaultMeta.put(updatedMeta)

  if (completed && deleteLegacyAfterSuccess) {
    await Promise.all([
      dbRef.passwords.clear(),
      dbRef.notes.clear(),
      dbRef.files.clear()
    ])
  }

  return updatedMeta
}

export async function ensureMigration(key) {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  if (!meta) return null
  if (meta.migrationState?.status === 'completed') return meta

  return migrateLegacyRecords(db, key, { deleteLegacyAfterSuccess: true })
}

export async function getVaultSnapshot() {
  const meta = await db.vaultMeta.get(VAULT_META_ID)
  return {
    meta,
    session: activeSession,
    hasSensitiveStorage: typeof window !== 'undefined' && (
      window.localStorage.getItem('vault-master-password') !== null ||
      window.sessionStorage.getItem('vault-master-password') !== null ||
      document.cookie.includes('vault-master-password')
    )
  }
}

export function getStorageFingerprint(bytes) {
  return toHex(bytes)
}

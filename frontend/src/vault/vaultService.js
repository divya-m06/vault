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

function toArrayBuffer(value) {
  return normalizeBuffer(value) || new ArrayBuffer(0)
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

function getAuthHeaders() {
  const token = getAuthToken()
  if (!token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

let authTokenGetter = null
export function setAuthTokenGetter(getter) {
  authTokenGetter = getter
}

function getAuthToken() {
  if (authTokenGetter) return authTokenGetter()
  return null
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

export async function deriveAuthValue(password, email) {
  const encoder = new TextEncoder()
  const saltString = email.trim().toLowerCase() + "vault-auth-v1"
  const saltHashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(saltString))
  
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltHashBuffer,
      iterations: KDF_ITERATIONS
    },
    passwordKey,
    256
  )
  
  return arrayBufferToBase64(derivedBits)
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

async function apiFetch(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (!baseUrl) throw new Error('VITE_API_BASE_URL is not configured')
  const url = `${baseUrl.replace(/\/$/, '')}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {}
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  if (response.status === 204) return null
  return response.json()
}

export async function initializeOrUnlockVault(password, email, options = {}) {
  if (!email) throw new Error("Email is required to initialize or unlock the vault")
  
  const autoLockMinutes = options.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES

  let meta
  let created = false
  try {
    meta = await apiFetch('/vault/meta')
  } catch (error) {
    if (error.status !== 404) throw error
  }

  if (!meta) {
    const salt = createRandomSalt()
    const key = await deriveKeyFromPassword(password, salt)
    const verifier = crypto.getRandomValues(new Uint8Array(32))
    const verifierIv = createRandomIv()
    const verifierEnvelope = await encryptBytes(verifier, key, verifierIv)

    const createPayload = {
      crypto_version: CRYPTO_VERSION,
      kdf_algorithm: KDF_ALGORITHM,
      kdf_iterations: KDF_ITERATIONS,
      kdf_salt: arrayBufferToBase64(salt),
      verifier_iv: arrayBufferToBase64(verifierIv),
      verifier_ciphertext: arrayBufferToBase64(verifierEnvelope.ciphertext),
      auto_lock_minutes: autoLockMinutes
    }

    try {
      meta = await apiFetch('/vault/meta', {
        method: 'POST',
        body: JSON.stringify(createPayload)
      })
      created = true
    } catch (error) {
      if (error.status === 409) {
        meta = await apiFetch('/vault/meta')
      } else {
        throw error
      }
    }
  }

  const key = await deriveKeyFromPassword(password, base64ToArrayBuffer(meta.kdf_salt))
  try {
    await decryptBytes(
      { iv: base64ToArrayBuffer(meta.verifier_iv), ciphertext: base64ToArrayBuffer(meta.verifier_ciphertext) },
      key
    )
  } catch (error) {
    return { ok: false, reason: 'invalid-password' }
  }

  const session = {
    key,
    meta,
    autoLockMinutes: meta.auto_lock_minutes ?? DEFAULT_AUTO_LOCK_MINUTES
  }
  setActiveVaultSession(session)
  return { ok: true, session, created }
}

export async function lockVault() {
  clearActiveVaultSession()
}

export async function updateAutoLockPreference(minutes) {
  const response = await apiFetch('/vault/meta', {
    method: 'PATCH',
    body: JSON.stringify({ auto_lock_minutes: minutes })
  })
  if (activeSession) {
    activeSession.autoLockMinutes = minutes
  }
  return response
}

export async function getAutoLockPreference() {
  try {
    const meta = await apiFetch('/vault/meta')
    return meta?.auto_lock_minutes ?? DEFAULT_AUTO_LOCK_MINUTES
  } catch {
    return DEFAULT_AUTO_LOCK_MINUTES
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

  const items = await apiFetch('/vault/items')

  const decryptEntries = async (entries, type) => {
    const decrypted = []
    for (const entry of entries) {
      try {
        const payload = await decryptJson({ iv: base64ToArrayBuffer(entry.iv), ciphertext: base64ToArrayBuffer(entry.ciphertext) }, key)
        const item = buildPlainItem(payload, type)
        if (item) {
          // The server row id is canonical; the id embedded in the encrypted
          // payload is only a client-side placeholder and must not be used for
          // DELETE/PATCH URL routing.
          item.id = entry.id
          if (type === 'file') {
            let decodedBytes = new ArrayBuffer(0)
            if (payload.fileBytes) {
              if (typeof payload.fileBytes === 'string') {
                decodedBytes = base64ToArrayBuffer(payload.fileBytes)
              } else if (payload.fileBytes instanceof ArrayBuffer || ArrayBuffer.isView(payload.fileBytes)) {
                decodedBytes = toArrayBuffer(payload.fileBytes)
              }
            } else {
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

  const byType = { password: [], note: [], file: [] }
  for (const entry of items) {
    if (byType[entry.item_type]) {
      byType[entry.item_type].push(entry)
    }
  }

  const [decryptedPasswords, decryptedNotes, decryptedFiles] = await Promise.all([
    decryptEntries(byType.password, 'password'),
    decryptEntries(byType.note, 'note'),
    decryptEntries(byType.file, 'file')
  ])

  return [...decryptedPasswords, ...decryptedNotes, ...decryptedFiles].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
}

export async function saveVaultItem(type, payload, key) {
  if (!key) throw new Error('Vault is locked')

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
    const created = await apiFetch('/vault/items', {
      method: 'POST',
      body: JSON.stringify({
        item_type: type,
        iv: arrayBufferToBase64(encrypted.iv),
        ciphertext: arrayBufferToBase64(encrypted.ciphertext),
        crypto_version: CRYPTO_VERSION
      })
    })
    return { ...itemPayload, id: created.id, fileBytes: fileBytes || null, blob: payload.blob ? payload.blob : new Blob([toArrayBuffer(fileBytes)], { type: payload.type || 'application/octet-stream' }) }
  }

  const itemPayload = {
    ...payload,
    id: recordId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
  const encrypted = await encryptJson(itemPayload, key)
  const created = await apiFetch('/vault/items', {
    method: 'POST',
    body: JSON.stringify({
      item_type: type,
      iv: arrayBufferToBase64(encrypted.iv),
      ciphertext: arrayBufferToBase64(encrypted.ciphertext),
      crypto_version: CRYPTO_VERSION
    })
  })
  return { ...itemPayload, id: created.id }
}

export async function updateVaultItem(type, payload, key) {
  if (!key) throw new Error('Vault is locked')

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
    await apiFetch(`/vault/items/${data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        iv: arrayBufferToBase64(encrypted.iv),
        ciphertext: arrayBufferToBase64(encrypted.ciphertext)
      })
    })
    return { ...itemPayload, id: data.id, fileBytes: fileBytes || null, blob: payload.blob ? payload.blob : new Blob([toArrayBuffer(fileBytes)], { type: payload.type || 'application/octet-stream' }) }
  }

  const itemPayload = {
    ...payload,
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  }
  const encrypted = await encryptJson(itemPayload, key)
  await apiFetch(`/vault/items/${data.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      iv: arrayBufferToBase64(encrypted.iv),
      ciphertext: arrayBufferToBase64(encrypted.ciphertext)
    })
  })
  return { ...itemPayload, id: data.id }
}

export async function deleteVaultItem(type, id) {
  await apiFetch(`/vault/items/${id}`, {
    method: 'DELETE'
  })
}
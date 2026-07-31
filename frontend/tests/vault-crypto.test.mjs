import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveKeyFromPassword, encryptBytes, decryptBytes, encryptJson, decryptJson, migrateLegacyRecords } from '../src/vault/vaultService.js'

const password = 'CorrectHorseBatteryStaple'

function makeFakeDb(records) {
  return {
    passwords: {
      toArray: async () => records.passwords || [],
      get: async (id) => (records.passwords || []).find((item) => item.id === id),
      put: async (item) => {
        records.passwords = [...(records.passwords || []).filter((entry) => entry.id !== item.id), item]
      },
      delete: async (id) => {
        records.passwords = (records.passwords || []).filter((entry) => entry.id !== id)
      }
    },
    notes: {
      toArray: async () => records.notes || [],
      get: async (id) => (records.notes || []).find((item) => item.id === id),
      put: async (item) => {
        records.notes = [...(records.notes || []).filter((entry) => entry.id !== item.id), item]
      },
      delete: async (id) => {
        records.notes = (records.notes || []).filter((entry) => entry.id !== id)
      }
    },
    files: {
      toArray: async () => records.files || [],
      get: async (id) => (records.files || []).find((item) => item.id === id),
      put: async (item) => {
        records.files = [...(records.files || []).filter((entry) => entry.id !== item.id), item]
      },
      delete: async (id) => {
        records.files = (records.files || []).filter((entry) => entry.id !== id)
      }
    },
    encryptedPasswords: {
      get: async (id) => records.encryptedPasswords?.find((item) => item.id === id),
      put: async (item) => {
        records.encryptedPasswords = [...(records.encryptedPasswords || []).filter((entry) => entry.id !== item.id), item]
      }
    },
    encryptedNotes: {
      get: async (id) => records.encryptedNotes?.find((item) => item.id === id),
      put: async (item) => {
        records.encryptedNotes = [...(records.encryptedNotes || []).filter((entry) => entry.id !== item.id), item]
      }
    },
    encryptedFiles: {
      get: async (id) => records.encryptedFiles?.find((item) => item.id === id),
      put: async (item) => {
        records.encryptedFiles = [...(records.encryptedFiles || []).filter((entry) => entry.id !== item.id), item]
      }
    },
    vaultMeta: {
      get: async (id) => records.vaultMeta?.find((item) => item.id === id),
      put: async (item) => {
        records.vaultMeta = [...(records.vaultMeta || []).filter((entry) => entry.id !== item.id), item]
      }
    }
  }
}

test('encrypt/decrypt round trip preserves text', async () => {
  const key = await deriveKeyFromPassword(password, new Uint8Array(16))
  const payload = { title: 'Hello', secret: 'world' }
  const encrypted = await encryptJson(payload, key)
  const decrypted = await decryptJson(encrypted, key)
  assert.deepEqual(decrypted, payload)
})

test('migration is idempotent and preserves the same record ids', async () => {
  const records = {
    passwords: [{ id: 'p1', name: 'Example', username: 'me', password: 'secret', website: 'https://example.com', notes: 'hello' }],
    notes: [],
    files: []
  }
  const fakeDb = makeFakeDb(records)
  const key = await deriveKeyFromPassword(password, new Uint8Array(16))

  await migrateLegacyRecords(fakeDb, key, { deleteLegacyAfterSuccess: false })
  await migrateLegacyRecords(fakeDb, key, { deleteLegacyAfterSuccess: false })

  assert.equal(records.encryptedPasswords.length, 1)
  assert.equal(records.encryptedPasswords[0].id, 'p1')
  assert.equal(records.passwords.length, 1)
  assert.equal(records.passwords[0].id, 'p1')
})

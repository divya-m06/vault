/**
 * Regression test for the client/server item-id mismatch.
 *
 * Bug: saveVaultItem generated a client-side UUID and embedded it in the
 * encrypted payload, but POSTed without an id — so the backend assigned a
 * different row id. The frontend kept using the client id everywhere, so
 * DELETE /vault/items/{client-id} returned 404 "Vault item not found"
 * (and PATCH had the same problem).
 *
 * These tests prove the canonical id is the SERVER-returned id at every
 * step: create -> list -> update -> delete.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  saveVaultItem,
  updateVaultItem,
  deleteVaultItem,
  loadVaultItems,
  deriveKeyFromPassword,
  createRandomSalt,
  encryptJson,
  setAuthTokenGetter,
} from '../vault/vaultService.js'

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// A fixed base64 for the API host so URL assertions are deterministic.
const API_HOST = 'http://127.0.0.1:8000'

// Client-generated id that the OLD code would have wrongly kept.
const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
// Server-assigned row id (what the backend returns from POST and list).
const SERVER_ID = '550e8400-e29b-41d4-a716-446655440000'

function makeFetchMock() {
  const calls = []
  const fetcher = async (url, options = {}) => {
    calls.push({ url: String(url), options })
    const method = options.method || 'GET'
    const path = String(url).replace(API_HOST, '')

    if (method === 'POST' && path === '/vault/items') {
      return jsonResponse(201, {
        id: SERVER_ID,
        item_type: 'note',
        iv: '',
        ciphertext: '',
        crypto_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    if (method === 'GET' && path === '/vault/items') {
      // Encrypt a payload that (incorrectly) carries the CLIENT id inside it,
      // to prove loadVaultItems must ignore that and use the server row id.
      const encrypted = await encryptJson(
        { id: CLIENT_ID, title: 'hi', content: 'hello', createdAt: 1, updatedAt: 1 },
        await testKey
      )
      return jsonResponse(200, [
        {
          id: SERVER_ID,
          item_type: 'note',
          iv: bufferToBase64(encrypted.iv),
          ciphertext: bufferToBase64(encrypted.ciphertext),
          crypto_version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
    }

    if (method === 'PATCH' && path === `/vault/items/${SERVER_ID}`) {
      return jsonResponse(200, { id: SERVER_ID })
    }

    if (method === 'DELETE' && path === `/vault/items/${SERVER_ID}`) {
      return jsonResponse(204, null)
    }

    return jsonResponse(404, { detail: 'Vault item not found' })
  }
  return { fetcher, calls }
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

let testKey
let fetchMock

beforeEach(async () => {
  // Real key material (same crypto path the app uses).
  testKey = await deriveKeyFromPassword('test-master-password', createRandomSalt())
  fetchMock = makeFetchMock()
  vi.stubGlobal('fetch', fetchMock.fetcher)
  setAuthTokenGetter(() => 'fake-jwt-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthTokenGetter(null)
})

describe('vault item id is the server-returned id, not the client-generated id', () => {
  it('saveVaultItem returns the server-assigned id from the POST response', async () => {
    const saved = await saveVaultItem('note', { id: CLIENT_ID, title: 'hi', content: 'hello' }, testKey)

    expect(saved.id).toBe(SERVER_ID)
    expect(saved.id).not.toBe(CLIENT_ID)
  })

  it('loadVaultItems uses the server row id even when the payload embeds a client id', async () => {
    const items = await loadVaultItems(testKey)

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe(SERVER_ID)
    expect(items[0].id).not.toBe(CLIENT_ID)
  })

  it('deleteVaultItem sends DELETE to the server-returned id', async () => {
    await deleteVaultItem('note', SERVER_ID)

    const deleteCall = fetchMock.calls.find((c) => c.options.method === 'DELETE')
    expect(deleteCall).toBeDefined()
    expect(deleteCall.url).toContain(`/vault/items/${SERVER_ID}`)
    expect(deleteCall.url).not.toContain(CLIENT_ID)
  })

  it('updateVaultItem sends PATCH to the server-returned id', async () => {
    // The edit form passes the item id from the (corrected) loaded list.
    await updateVaultItem('note', { id: SERVER_ID, title: 'hi', content: 'changed' }, testKey)

    const patchCall = fetchMock.calls.find((c) => c.options.method === 'PATCH')
    expect(patchCall).toBeDefined()
    expect(patchCall.url).toContain(`/vault/items/${SERVER_ID}`)
    expect(patchCall.url).not.toContain(CLIENT_ID)
  })
})
